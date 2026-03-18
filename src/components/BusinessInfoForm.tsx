const BusinessInfoForm = () => {
  return (
    <div className="max-w-4xl space-y-8">
      <section>
        <h2 className="dxg-section-title mb-6">사업장 기본 정보 입력</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div className="space-y-1.5">
            <label className="dxg-label">사업장명</label>
            <input type="text" className="dxg-input" placeholder="사업장명을 입력하세요" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">지역구분</label>
            <select className="dxg-input">
              <option value="">선택하세요</option>
              <option>서울</option>
              <option>경기</option>
              <option>인천</option>
              <option>부산</option>
              <option>대구</option>
              <option>광주</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">사업자등록번호</label>
            <input type="text" className="dxg-input" placeholder="000-00-00000" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">대표자명</label>
            <input type="text" className="dxg-input" placeholder="대표자명을 입력하세요" />
          </div>
          <div className="space-y-1.5 col-span-2">
            <label className="dxg-label">사업장 주소</label>
            <input type="text" className="dxg-input" placeholder="주소를 입력하세요" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">전화번호</label>
            <input type="text" className="dxg-input" placeholder="02-0000-0000" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">담당자 이메일</label>
            <input type="email" className="dxg-input" placeholder="email@example.com" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="dxg-section-title mb-6">사업장 부가 정보</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div className="space-y-1.5">
            <label className="dxg-label">업종</label>
            <select className="dxg-input">
              <option value="">선택하세요</option>
              <option>제조업</option>
              <option>건설업</option>
              <option>서비스업</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">종업원 수</label>
            <input type="number" className="dxg-input" placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">사업장 면적 (㎡)</label>
            <input type="number" className="dxg-input" placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">설립연도</label>
            <input type="number" className="dxg-input" placeholder="2024" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default BusinessInfoForm;
