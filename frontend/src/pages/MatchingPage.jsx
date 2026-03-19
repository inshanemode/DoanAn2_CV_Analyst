import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

function MatchingPage() {
  const [cvs, setCvs] = useState([]);
  const [jds, setJds] = useState([]);
  const [selectedCvId, setSelectedCvId] = useState('');
  const [selectedJdId, setSelectedJdId] = useState('');

  const [loadingSource, setLoadingSource] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [latestResult, setLatestResult] = useState(null);
  const [resultHistory, setResultHistory] = useState([]);
  const [readInfo, setReadInfo] = useState(null);
  const [isPollingResult, setIsPollingResult] = useState(false);

  const canAnalyze = selectedCvId && selectedJdId && !analyzing;

  const selectedCv = useMemo(
    () => cvs.find((item) => item.cv_id === selectedCvId),
    [cvs, selectedCvId],
  );

  const selectedJd = useMemo(
    () => jds.find((item) => item.jd_id === selectedJdId),
    [jds, selectedJdId],
  );

  useEffect(() => {
    const bootstrap = async () => {
      setLoadingSource(true);
      setError('');

      try {
        const [cvRes, jdRes] = await Promise.all([
          api.get('/cvs/'),
          api.get('/jds/'),
        ]);

        const cvData = cvRes.data || [];
        const jdData = jdRes.data || [];

        setCvs(cvData);
        setJds(jdData);

        if (cvData.length > 0) {
          setSelectedCvId(cvData[0].cv_id);
        }
        if (jdData.length > 0) {
          setSelectedJdId(jdData[0].jd_id);
        }
      } catch (apiError) {
        setError(apiError.response?.data?.detail || 'Không thể tải danh sách CV/JD.');
      } finally {
        setLoadingSource(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      if (!selectedCvId) {
        setResultHistory([]);
        return;
      }

      try {
        const response = await api.get(`/analysis/cv/${selectedCvId}`);
        setResultHistory(response.data || []);
      } catch {
        setResultHistory([]);
      }
    };

    loadHistory();
  }, [selectedCvId]);

  const refreshHistory = async (cvId) => {
    if (!cvId) {
      setResultHistory([]);
      return;
    }

    try {
      const response = await api.get(`/analysis/cv/${cvId}`);
      setResultHistory(response.data || []);
    } catch {
      setResultHistory([]);
    }
  };

  const runAnalysis = async () => {
    if (!canAnalyze) return;

    setAnalyzing(true);
    setError('');
    setSuccess('');
    const startedAt = new Date();

    try {
      const payload = {
        cv_id: selectedCvId,
        jd_id: selectedJdId,
      };

      const response = await api.post('/analysis/', payload, { timeout: 120000 });
      setLatestResult(response.data);
      if (response.data?.trang_thai === 'PROCESSING') {
        setSuccess('Hệ thống đang xử lý, sẽ tự động cập nhật khi có kết quả...');
        const done = await pollAnalysisResult(selectedCvId, selectedJdId, startedAt);
        if (done) {
          await refreshHistory(selectedCvId);
        }
      } else {
        setSuccess('Phân tích hoàn tất.');
        await refreshHistory(selectedCvId);
      }
    } catch (apiError) {
      const isTimeout = apiError.code === 'ECONNABORTED';

      if (isTimeout) {
        setSuccess('Phân tích đang chạy nền. Trang sẽ tự cập nhật khi có kết quả, bạn không cần tải lại.');
        const done = await pollAnalysisResult(selectedCvId, selectedJdId, startedAt);
        if (!done) {
          setError('Hệ thống xử lý lâu hơn bình thường. Bạn có thể đợi thêm hoặc bấm chấm điểm lại sau ít phút.');
        }
      } else {
        setError(apiError.response?.data?.detail || 'Không thể phân tích CV/JD.');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const pollAnalysisResult = async (cvId, jdId, startedAt) => {
    if (!cvId || !jdId) return false;

    const maxAttempts = 40;
    const intervalMs = 3000;
    setIsPollingResult(true);

    try {
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const historyResponse = await api.get(`/analysis/cv/${cvId}`);
        const historyItems = historyResponse.data || [];
        setResultHistory(historyItems);

        const samePair = historyItems
          .filter((item) => item.jd_id === jdId)
          .sort((left, right) => new Date(right.updated_at) - new Date(left.updated_at));

        const targetResult =
          samePair.find((item) => new Date(item.updated_at) >= startedAt) ||
          samePair[0];

        if (targetResult && targetResult.trang_thai === 'COMPLETED') {
          setLatestResult(targetResult);
          setSuccess('Phân tích hoàn tất. Kết quả đã tự động cập nhật.');
          return true;
        }

        if (targetResult && targetResult.trang_thai === 'FAILED') {
          setLatestResult(targetResult);
          setError(targetResult.goi_y || 'Phân tích thất bại. Vui lòng thử lại.');
          return true;
        }

        await sleep(intervalMs);
      }

      return false;
    } catch {
      return false;
    } finally {
      setIsPollingResult(false);
    }
  };

  const handleReadResult = async (resultId) => {
    // Nếu đang mở đúng kết quả này thì bấm lại sẽ đóng
    if (readInfo?.resultId === resultId) {
      setReadInfo(null);
      setLatestResult(null);
      setError('');
      setSuccess('');
      return;
    }

    setError('');
    setSuccess('');
    try {
      const response = await api.get(`/analysis/result/${resultId}`);
      const result = response.data;
      setLatestResult(result);

      const cv = cvs.find((item) => item.cv_id === result.cv_id);
      const jd = jds.find((item) => item.jd_id === result.jd_id);

      const cvRawText = cv?.du_lieu_trich_xuat?.raw_text || '';
      const jdRawText = jd?.noi_dung || '';

      setReadInfo({
        resultId: result.result_id,
        cvFile: cv?.du_lieu_trich_xuat?.source_file || cv?.duong_dan || 'N/A',
        cvText: cvRawText || 'Không có dữ liệu trích xuất CV.',
        jdTitle: jd?.tieu_de || 'N/A',
        jdText: jdRawText || 'Không có nội dung JD.',
      });

      setSuccess('Đã đọc lại thông tin CV/JD trích xuất.');
    } catch (apiError) {
      setError(apiError.response?.data?.detail || 'Không thể đọc chi tiết kết quả.');
    }
  };

  const handleDeleteResult = async (resultId) => {
    const confirmed = window.confirm('Bạn có chắc muốn xóa kết quả phân tích này?');
    if (!confirmed) return;

    setError('');
    setSuccess('');
    try {
      await api.delete(`/analysis/result/${resultId}`);

      if (latestResult?.result_id === resultId) {
        setLatestResult(null);
      }

      if (readInfo?.resultId === resultId) {
        setReadInfo(null);
      }

      setSuccess('Đã xóa kết quả phân tích.');
      await refreshHistory(selectedCvId);
    } catch (apiError) {
      setError(apiError.response?.data?.detail || 'Không thể xóa kết quả phân tích.');
    }
  };

  const formatScore = (value) => {
    if (value === null || value === undefined || value === '') return '--';
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return '--';
    return `${parsed.toFixed(2)}`;
  };

  const scoreColorClass = (value) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return 'text-gray-600';
    if (parsed >= 80) return 'text-green-600';
    if (parsed >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loadingSource) {
    return (
      <div className="mac-glass rounded-[20px] p-[32px] min-h-[520px] flex items-center justify-center text-gray-500 text-xl">
        Đang tải dữ liệu CV/JD...
      </div>
    );
  }

  return (
    <>
      <div className="mac-glass rounded-[20px] p-[32px] min-h-[520px] flex flex-col gap-6 text-base md:text-lg">
        <div className="flex justify-between items-center border-b border-black/5 pb-5">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">Phân tích & So khớp CV - JD</h1>
          <button
            onClick={runAnalysis}
            disabled={!canAnalyze}
            className="mac-button px-6 py-3 text-lg font-bold transition-colors shadow-sm disabled:opacity-60"
          >
            {analyzing ? 'Đang phân tích...' : 'Chấm điểm'}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-600 text-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-green-700 text-lg">
            {success}
          </div>
        )}

        {isPollingResult && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-blue-700 text-lg">
            Đang tự động kiểm tra kết quả phân tích...
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">Chọn CV</label>
            <select
              value={selectedCvId}
              onChange={(event) => setSelectedCvId(event.target.value)}
              className="w-full rounded-xl border border-black/10 px-5 py-4 bg-white outline-none focus:border-blue-400 text-lg"
            >
              {cvs.length === 0 && <option value="">Chưa có CV</option>}
              {cvs.map((cv) => (
                <option key={cv.cv_id} value={cv.cv_id}>
                  {(cv.du_lieu_trich_xuat?.source_file || cv.duong_dan).slice(0, 80)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">Chọn JD</label>
            <select
              value={selectedJdId}
              onChange={(event) => setSelectedJdId(event.target.value)}
              className="w-full rounded-xl border border-black/10 px-5 py-4 bg-white outline-none focus:border-blue-400 text-lg"
            >
              {jds.length === 0 && <option value="">Chưa có JD</option>}
              {jds.map((jd) => (
                <option key={jd.jd_id} value={jd.jd_id}>
                  {jd.tieu_de}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(cvs.length === 0 || jds.length === 0) && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-5 py-4 text-yellow-700 text-lg">
            Cần có ít nhất 1 CV và 1 JD để thực hiện chấm điểm.
          </div>
        )}

        {latestResult && (
          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-3xl font-bold text-gray-900">Kết quả mới nhất</h2>
              <span className={`text-5xl font-extrabold ${scoreColorClass(latestResult.diem_tong)}`}>
                {formatScore(latestResult.diem_tong)}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              {(latestResult.chi_tiet_diem || []).map((detail, index) => (
                <div key={`${detail.tieu_chi}-${index}`} className="rounded-xl border border-black/10 px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-lg font-semibold text-gray-900">{detail.tieu_chi}</p>
                    <p className={`text-xl font-bold ${scoreColorClass(detail.diem)}`}>{formatScore(detail.diem)}</p>
                  </div>
                  <p className="text-base text-gray-600">{detail.nhan_xet}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-black/[0.03] px-4 py-3">
              <p className="text-lg font-semibold text-gray-700 mb-1">Gợi ý cải thiện</p>
              <p className="text-base text-gray-600 whitespace-pre-line">{latestResult.goi_y || 'Không có gợi ý.'}</p>
            </div>
          </div>
        )}

        {readInfo && (
          <div className="relative rounded-2xl border border-black/10 bg-white p-6">
            <button
              type="button"
              onClick={() => {
                setReadInfo(null);
                setLatestResult(null);
                setError('');
                setSuccess('');
              }}
              aria-label="Đóng chi tiết"
              className="absolute top-3 right-3 inline-flex items-center justify-center rounded-full bg-gray-100 w-9 h-9 text-lg font-bold text-gray-600 hover:bg-gray-200"
            >
              ✕
            </button>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Thông tin trích xuất (R)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-black/10 p-4 bg-black/[0.02]">
                <p className="text-lg font-semibold text-gray-700 mb-2">Toàn văn CV: {readInfo.cvFile}</p>
                <div className="modern-scrollbar max-h-64 overflow-y-auto whitespace-pre-line text-base text-gray-700">
                  {readInfo.cvText}
                </div>
              </div>
              <div className="rounded-xl border border-black/10 p-4 bg-black/[0.02]">
                <p className="text-lg font-semibold text-gray-700 mb-2">Toàn văn JD: {readInfo.jdTitle}</p>
                <div className="modern-scrollbar max-h-64 overflow-y-auto whitespace-pre-line text-base text-gray-700">
                  {readInfo.jdText}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Các kết quả đã lưu cho CV: {(selectedCv?.du_lieu_trich_xuat?.source_file || selectedCv?.duong_dan || 'Chưa chọn CV').slice(0, 100)}
          </h2>
          {resultHistory.length > 0 && (
            <p className="text-base text-gray-500 mb-4">
              Chọn "Xem chi tiết" để mở lại một kết quả. Khi bạn bấm "Chấm điểm" với cùng cặp CV/JD,
              kết quả mới sẽ cập nhật vào mục này.
            </p>
          )}
          {resultHistory.length === 0 ? (
            <p className="text-lg text-gray-500">Chưa có kết quả phân tích cho CV đã chọn.</p>
          ) : (
            <div className="space-y-3">
              {resultHistory.map((result) => {
                const jd = jds.find((item) => item.jd_id === result.jd_id);
                const status = result.trang_thai;
                const statusColor =
                  status === 'COMPLETED'
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : status === 'PROCESSING'
                      ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                      : 'bg-red-100 text-red-700 border-red-200';

                return (
                  <div key={result.result_id} className="rounded-xl border border-black/10 px-5 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-lg font-semibold text-gray-900 truncate">
                          JD: {jd?.tieu_de || 'JD đã xóa hoặc không tìm thấy'}
                        </p>
                        <p className="text-sm text-gray-500 break-all">Mã kết quả: {result.result_id}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          Trạng thái:
                          <span className={`ml-2 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusColor}`}>
                            {status === 'COMPLETED'
                              ? 'Hoàn tất'
                              : status === 'PROCESSING'
                                ? 'Đang xử lý'
                                : 'Thất bại'}
                          </span>
                        </p>
                      </div>
                      <p className={`text-3xl font-extrabold flex-shrink-0 ${scoreColorClass(result.diem_tong)}`}>
                        {formatScore(result.diem_tong)}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleReadResult(result.result_id)}
                        className="inline-flex items-center rounded-full bg-blue-600 px-5 py-2.5 text-base font-semibold text-white hover:bg-blue-700"
                      >
                        Xem chi tiết
                      </button>
                      <button
                        onClick={() => handleDeleteResult(result.result_id)}
                        className="inline-flex items-center rounded-full bg-red-600 px-5 py-2.5 text-base font-semibold text-white hover:bg-red-700"
                      >
                        Xóa kết quả
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selectedCv && (
          <p className="text-sm text-gray-500">
            CV đang chọn: {(selectedCv.du_lieu_trich_xuat?.source_file || selectedCv.duong_dan).slice(0, 120)}
            {selectedJd ? ` | JD đang chọn: ${selectedJd.tieu_de}` : ''}
          </p>
        )}
      </div>
    </>
  );
}

export default MatchingPage;
