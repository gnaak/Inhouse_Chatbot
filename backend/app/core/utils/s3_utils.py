import asyncio

import boto3

from app.core.config.settings import settings

_client = boto3.client(
    "s3",
    aws_access_key_id=settings.aws_access_key_id,
    aws_secret_access_key=settings.aws_secret_access_key,
    region_name=settings.aws_s3_region,
)


def _upload_sync(image_bytes: bytes, key: str) -> str:
    _client.put_object(
        Bucket=settings.aws_s3_bucket,
        Key=key,
        Body=image_bytes,
        ContentType="image/png",
    )
    return f"https://{settings.aws_s3_bucket}.s3.{settings.aws_s3_region}.amazonaws.com/{key}"


def _upload_file_sync(data: bytes, key: str, content_type: str) -> str:
    _client.put_object(
        Bucket=settings.aws_s3_bucket,
        Key=key,
        Body=data,
        ContentType=content_type,
    )
    return key


def _presigned_url_sync(key: str, expires: int) -> str:
    return _client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.aws_s3_bucket, "Key": key},
        ExpiresIn=expires,
    )


def _get_object_sync(key: str) -> tuple[bytes, str]:
    resp = _client.get_object(Bucket=settings.aws_s3_bucket, Key=key)
    return resp["Body"].read(), resp.get("ContentType", "image/png")


async def upload_image_to_s3(image_bytes: bytes, key: str) -> str:
    return await asyncio.to_thread(_upload_sync, image_bytes, key)


async def upload_file_to_s3(data: bytes, key: str, content_type: str) -> str:
    """범용 업로드. content_type 명시 가능. 반환값은 S3 key (URL이 아님)."""
    return await asyncio.to_thread(_upload_file_sync, data, key, content_type)


async def get_presigned_url(key: str, expires: int = 3600) -> str:
    return await asyncio.to_thread(_presigned_url_sync, key, expires)


async def get_s3_object(key: str) -> tuple[bytes, str]:
    return await asyncio.to_thread(_get_object_sync, key)


def _delete_object_sync(key: str) -> None:
    _client.delete_object(Bucket=settings.aws_s3_bucket, Key=key)


async def delete_s3_object(key: str) -> None:
    """S3에서 객체 삭제."""
    return await asyncio.to_thread(_delete_object_sync, key)
