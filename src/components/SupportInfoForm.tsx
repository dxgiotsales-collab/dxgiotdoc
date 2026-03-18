const SupportInfoForm = () => {
  return (
    <div className="max-w-4xl space-y-8">
      <section>
        <h2 className="dxg-section-title mb-6">지원사업 신청 정보</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div className="space-y-1.5">
            <label className="dxg-label">지원사업명</label>
            <select className="dxg-input">
              <option value="">선택하세요</option>
              <option>에너지 효율화 사업</option>
              <option>스마트팩토리 구축 지원</option>
              <option>IoT 인프라 보급</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">신청 연도</label>
            <select className="dxg-input">
              <option value="">선택하세요</option>
              <option>2024</option>
              <option>2025</option>
              <option>2026</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">신청 금액 (원)</label>
            <input type="text" className="dxg-input" placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">자부담 비율 (%)</label>
            <input type="number" className="dxg-input" placeholder="30" />
          </div>
          <div className="space-y-1.5 col-span-2">
            <label className="dxg-label">사업 개요</label>
            <textarea
              className="dxg-input h-24 py-2 resize-none"
              placeholder="지원사업의 주요 내용을 입력하세요"
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="dxg-section-title mb-6">첨부서류 정보</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div className="space-y-1.5">
            <label className="dxg-label">사업계획서</label>
            <input type="file" className="dxg-input pt-1.5 text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">견적서</label>
            <input type="file" className="dxg-input pt-1.5 text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">담당자명</label>
            <input type="text" className="dxg-input" placeholder="담당자명" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">연락처</label>
            <input type="text" className="dxg-input" placeholder="010-0000-0000" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default SupportInfoForm;
