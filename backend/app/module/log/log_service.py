# app/module/user/user_service.py

import json as _json
from fastapi import Request

from app.core.utils.response import fail
from app.module.directory.directory_repository import DirectoryRepository
from app.module.log.log_repository import LogRepository


def _parse_json_list(s: str | None) -> list[str]:
    """'["a","b"]' → ["a","b"],  "a" → ["a"],  None → []"""
    if not s:
        return []
    try:
        parsed = _json.loads(s)
        if isinstance(parsed, list):
            return [str(x) for x in parsed]
        return [str(parsed)]
    except (ValueError, TypeError):
        return [s]


class LogService:
    def __init__(self, repo: LogRepository, directory_repo: DirectoryRepository):
        self.repo = repo
        self.directory_repo = directory_repo

    async def get_log_list(self, request: Request):
        query_params = request.query_params
        page = int(query_params.get("page", 1))
        row_count = int(query_params.get("row_count", 12))
        search_value = query_params.get("search_value", "")
        directory_id = query_params.get("directory", "")
        directory_name = None
        if directory_id and directory_id != "all":
            directory = await self.directory_repo.get_directory_by_id(directory_id)
            directory_name = directory.name
        start = query_params.get("start", "")
        end = query_params.get("end", "")
        llm = query_params.get("llm", "")
        logs, total = await self.repo.get_log_list(page, search_value, row_count, directory_name, start, end, llm)

        log_list = []
        for log in logs:
            log_list.append({
                "id": log.id,
                "name": log.name,
                "email": log.email,
                "directory": log.directory_name,
                "created_at": log.created_at,
                "version": log.version,
                "is_deleted": log.is_deleted,
                "deleted_at": log.deleted_at,
            })
        return { "log_list": log_list, "total" : total }
    
    async def get_log_detail(self, request: Request):
        query_params = request.query_params
        log_id = query_params.get("log_id")
        if not log_id:
            return fail(message="사용 기록 ID 값이 없습니다.", status_code=404)
        details = await self.repo.get_log_details_ordered(int(log_id))
        items = []
        prev_version = None
        for d in details:
            if d.version and prev_version and d.version != prev_version:
                items.append({"type": "model_change", "version": d.version})
            if d.version:
                prev_version = d.version
            items.append({
                "type": "message",
                "id": d.id,
                "log_id": d.log_id,
                "question": d.question,
                "answer": d.answer,
                "version": d.version,
                "created_at": d.created_at,
                "image_base64": d.image_base64,
                "image_media_type": d.image_media_type,
                "image_key": d.image_key,
            })
        return items

    async def get_my_log_detail(self, request: Request):
        user_id = request.user_id
        session = request.query_params.get("session")
        log_id = request.query_params.get("log_id")

        if session:
            log = await self.repo.get_log_by_session_for_user(session, user_id)
        elif log_id:
            log = await self.repo.get_log_by_id_for_user(int(log_id), user_id)
        else:
            return fail(message="session 또는 log_id가 필요합니다.", status_code=400)

        if not log:
            return fail(message="해당 로그를 찾을 수 없습니다.", status_code=404)

        details = await self.repo.get_log_details_ordered(log.id)
        is_image = log.log_type == "image"
        messages = []
        prev_version = None
        for d in details:
            if d.version and prev_version and d.version != prev_version:
                messages.append({
                    "type": "model_change",
                    "message": d.version,
                    "created_at": d.created_at,
                })
            if d.version:
                prev_version = d.version
            user_msg = {
                "type": "user",
                "message": d.question,
                "created_at": d.question_created_at or d.created_at,
            }
            if d.image_key:
                keys = _parse_json_list(d.image_key)
                types = _parse_json_list(d.image_media_type)
                image_urls = []
                doc_files = []
                has_pdf = False
                for i, key in enumerate(keys):
                    mt = types[i] if i < len(types) else "image/jpeg"
                    if mt == "application/pdf":
                        has_pdf = True
                    elif mt.startswith("image/"):
                        image_urls.append(f"__BACKEND__/api/chat/file?key={key}")
                    else:
                        filename = key.split("/")[-1]
                        doc_files.append({"name": filename, "url": f"__BACKEND__/api/chat/file?key={key}"})
                if image_urls:
                    user_msg["imageUrl"] = image_urls[0]
                    user_msg["imageUrls"] = image_urls
                if has_pdf:
                    user_msg["pdfName"] = "PDF 첨부"
                if doc_files:
                    user_msg["docFiles"] = doc_files
            elif d.image_base64 and d.image_media_type:
                if d.image_media_type == "application/pdf":
                    user_msg["pdfName"] = "PDF 첨부"
                else:
                    url = f"data:{d.image_media_type};base64,{d.image_base64}"
                    user_msg["imageUrl"] = url
                    user_msg["imageUrls"] = [url]
            messages.append(user_msg)
            if is_image:
                messages.append({
                    "type": "bot",
                    "message": "이미지를 생성했어요.",
                    "imageUrl": d.answer,
                    "created_at": d.created_at,
                })
            else:
                messages.append({
                    "type": "bot",
                    "message": d.answer,
                    "created_at": d.created_at,
                })

        return {
            "id": log.id,
            "session": log.session,
            "directory_id": log.directory_id,
            "directory_name": log.name,
            "log_type": log.log_type,
            "version": log.version,
            "messages": messages,
        }

    async def search_my_logs(self, request: Request):
        user_id = request.user_id
        q = (request.query_params.get("q") or "").strip()
        if not q:
            return []
        limit = int(request.query_params.get("limit", 30))
        rows = await self.repo.search_user_logs(user_id, q, limit)

        items = []
        for row in rows:
            question = row.first_question or ""
            derived = question.strip().split("\n")[0][:40] or row.name
            title = (getattr(row, "title", None) or derived)
            items.append({
                "id": row.id,
                "session": row.session,
                "directory_id": row.directory_id,
                "directory_name": row.name,
                "title": title,
                "log_type": row.log_type,
                "updated_at": row.updated_at or row.created_at,
            })
        return items

    async def rename_my_log(self, request: Request):
        user_id = request.user_id
        body = await request.json()
        log_id = body.get("log_id")
        title = (body.get("title") or "").strip()
        if not log_id or not title:
            return fail(message="log_id와 title이 필요합니다.", status_code=400)
        ok = await self.repo.update_log_title(int(log_id), user_id, title[:200])
        if not ok:
            return fail(message="해당 로그를 찾을 수 없습니다.", status_code=404)
        await self.repo.db.commit()
        return {"id": int(log_id), "title": title[:200]}

    async def delete_my_log(self, request: Request):
        user_id = request.user_id
        body = await request.json()
        log_id = body.get("log_id")
        if not log_id:
            return fail(message="log_id가 필요합니다.", status_code=400)
        ok = await self.repo.delete_log(int(log_id), user_id)
        if not ok:
            return fail(message="해당 로그를 찾을 수 없습니다.", status_code=404)
        await self.repo.db.commit()
        return {"id": int(log_id)}

    async def get_my_images(self, request: Request):
        user_id = request.user_id
        try:
            limit = max(1, min(100, int(request.query_params.get("limit", 30))))
        except ValueError:
            limit = 30
        try:
            offset = max(0, int(request.query_params.get("offset", 0)))
        except ValueError:
            offset = 0

        rows = await self.repo.get_user_image_details(user_id, limit, offset)
        total = await self.repo.count_user_image_details(user_id)

        items = []
        for r in rows:
            items.append({
                "id": r.id,
                "log_id": r.log_id,
                "session": r.session,
                "prompt": r.question,
                "image_url": r.answer,
                "version": r.version,
                "created_at": r.created_at,
            })
        return {"items": items, "total": total, "limit": limit, "offset": offset}

    async def get_my_recent_logs(self, request: Request):
        user_id = request.user_id
        limit = int(request.query_params.get("limit", 20))
        start_date = request.query_params.get("start_date") or None
        end_date = request.query_params.get("end_date") or None
        rows = await self.repo.get_user_recent_logs(user_id, limit, start_date, end_date)

        items = []
        for row in rows:
            question = row.first_question or ""
            derived = question.strip().split("\n")[0][:40] or row.name
            title = (getattr(row, "title", None) or derived)
            items.append({
                "id": row.id,
                "session": row.session,
                "directory_id": row.directory_id,
                "directory_name": row.name,
                "title": title,
                "log_type": row.log_type,
                "updated_at": row.updated_at or row.created_at,
            })
        return items