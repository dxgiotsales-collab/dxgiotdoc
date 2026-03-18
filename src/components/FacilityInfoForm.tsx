const FacilityInfoForm = () => {
  return (
    <div className="max-w-4xl space-y-8">
      <section>
        <h2 className="dxg-section-title mb-6">시설 기본 정보</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div className="space-y-1.5">
            <label className="dxg-label">시설명</label>
            <input type="text" className="dxg-input" placeholder="시설명을 입력하세요" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">시설 유형</label>
            <select className="dxg-input">
              <option value="">선택하세요</option>
              <option>보일러</option>
              <option>냉동기</option>
              <option>공조기</option>
              <option>펌프</option>
              <option>기타</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">설치 위치</label>
            <input type="text" className="dxg-input" placeholder="설치 위치를 입력하세요" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">설치 연도</label>
            <input type="number" className="dxg-input" placeholder="2024" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">제조사</label>
            <input type="text" className="dxg-input" placeholder="제조사명" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">모델명</label>
            <input type="text" className="dxg-input" placeholder="모델명" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="dxg-section-title mb-6">IoT 센서 정보</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div className="space-y-1.5">
            <label className="dxg-label">센서 종류</label>
            <select className="dxg-input">
              <option value="">선택하세요</option>
              <option>온도 센서</option>
              <option>습도 센서</option>
              <option>전력 센서</option>
              <option>유량 센서</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">센서 ID</label>
            <input type="text" className="dxg-input" placeholder="SEN-0001" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">설치 일자</label>
            <input type="date" className="dxg-input" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">데이터 수집 주기 (초)</label>
            <input type="number" className="dxg-input" placeholder="60" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default FacilityInfoForm;
