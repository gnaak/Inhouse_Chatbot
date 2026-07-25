const UsersTab = ({ tab, setTab, requestNumber }) => {
  return (
    <>
      <div className="absolute -top-9 left-10 flex flex-row z-10 text-sm font-medium">
        <div className="w-full relative flex flex-row">
          <button
            className={`border border-b-0 p-3 py-2 w-[120px] flex items-center justify-center rounded-t-xl
                  ${tab == "user" ? "bg-white z-10" : "bg-[#4F4F4F]/10"}
                `}
            onClick={() => setTab("user")}
          >
            <span>전체 사용자</span>
          </button>
          <button
            className={`absolute left-28 border border-b-0 p-3 py-2 w-[120px] flex items-center justify-center flex-row gap-2 rounded-t-xl
                    ${tab === "request" ? "bg-white z-10" : "bg-[#4F4F4F]/10"}
                  `}
            onClick={() => setTab("request")}
          >
            <span>요청 처리</span>
            <div className="bg-[#4F4F4F] w-4 h-4 flex items-center justify-center rounded-full text-white">
              <span>{requestNumber}</span>
            </div>
          </button>
        </div>
      </div>
    </>
  );
};
export default UsersTab;
