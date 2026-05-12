import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatContext } from '../contexts/ChatContext';
import api from '../services/api';

function ScoreRing({ score }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    <div
      className="relative grid h-36 w-36 place-items-center rounded-full"
      style={{ background: `conic-gradient(#4f46e5 ${value * 3.6}deg, #e8eefb 0deg)` }}
    >
      <div className="grid h-28 w-28 place-items-center rounded-full bg-white">
        <div className="text-center">
          <span className="text-5xl font-extrabold">{Math.round(value)}</span>
          <span className="text-xl font-bold">%</span>
        </div>
      </div>
    </div>
  );
}

function DetailCard({ detail, index }) {
  const score = Math.max(0, Math.min(100, Number(detail.diem) || 0));
  const colors = ['bg-[#0b45d9]', 'bg-[#15d4ee]', 'bg-slate-500'];
  return (
    <div className="rounded-full border border-[#dce4f3] bg-[#eef4ff] px-5 py-4">
      <div className="mb-2 flex items-center justify-between gap-4">
        <p className="font-bold">{detail.tieu_chi}</p>
        <span className="text-sm font-bold text-[#0b45d9]">{score.toFixed(0)}%</span>
      </div>
      <div className="h-2 rounded-full bg-[#d8e5f8]">
        <div className={`h-2 rounded-full ${colors[index % colors.length]}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function MatchingPage() {
  const { setChatContext, setResultId } = useChatContext();
  const [cvs, setCvs] = useState([]);
  const [jds, setJds] = useState([]);
  const [selectedCvId, setSelectedCvId] = useState('');
  const [selectedJdId, setSelectedJdId] = useState('');
  const [loadingSource, setLoadingSource] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [isPollingResult, setIsPollingResult] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [latestResult, setLatestResult] = useState(null);
  const [resultHistory, setResultHistory] = useState([]);
  const [readInfo, setReadInfo] = useState(null);

  const selectedCv = useMemo(() => cvs.find((item) => item.cv_id === selectedCvId), [cvs, selectedCvId]);
  const selectedJd = useMemo(() => jds.find((item) => item.jd_id === selectedJdId), [jds, selectedJdId]);
  const canAnalyze = Boolean(selectedCvId && selectedJdId && !analyzing);

  useEffect(() => {
    const bootstrap = async () => {
      setLoadingSource(true);
      setError('');
      try {
        const [cvRes, jdRes] = await Promise.all([api.get('/cvs/'), api.get('/jds/')]);
        const cvData = cvRes.data || [];
        const jdData = jdRes.data || [];
        setCvs(cvData);
        setJds(jdData);
        if (cvData.length) setSelectedCvId(cvData[0].cv_id);
        if (jdData.length) setSelectedJdId(jdData[0].jd_id);
      } catch (apiError) {
        setError(apiError.response?.data?.detail || 'Không thể tải danh sách CV/JD.');
      } finally {
        setLoadingSource(false);
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    refreshHistory(selectedCvId);
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

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const pollAnalysisResult = async (cvId, jdId, startedAt) => {
    setIsPollingResult(true);
    try {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const historyResponse = await api.get(`/analysis/cv/${cvId}`);
        const historyItems = historyResponse.data || [];
        setResultHistory(historyItems);
        const samePair = historyItems
          .filter((item) => item.jd_id === jdId)
          .sort((left, right) => new Date(right.updated_at) - new Date(left.updated_at));
        const targetResult = samePair.find((item) => new Date(item.updated_at) >= startedAt) || samePair[0];

        if (targetResult?.trang_thai === 'COMPLETED') {
          setLatestResult(targetResult);
          setChatContext({
            resultId: targetResult.result_id,
            cvLabel: selectedCv?.du_lieu_trich_xuat?.source_file || selectedCv?.duong_dan || '',
            jdTitle: selectedJd?.tieu_de || '',
          });
          setSuccess('Phân tích hoàn tất.');
          return true;
        }
        if (targetResult?.trang_thai === 'FAILED') {
          setLatestResult(targetResult);
          setError(targetResult.goi_y || 'Phân tích thất bại.');
          return true;
        }
        await sleep(3000);
      }
      return false;
    } finally {
      setIsPollingResult(false);
    }
  };

  const runAnalysis = async () => {
    if (!canAnalyze) return;
    setAnalyzing(true);
    setError('');
    setSuccess('');
    const startedAt = new Date();

    try {
      const response = await api.post('/analysis/', { cv_id: selectedCvId, jd_id: selectedJdId }, { timeout: 120000 });
      setLatestResult(response.data);
      if (response.data?.result_id) {
        setChatContext({
          resultId: response.data.result_id,
          cvLabel: selectedCv?.du_lieu_trich_xuat?.source_file || selectedCv?.duong_dan || '',
          jdTitle: selectedJd?.tieu_de || '',
        });
      }
      if (response.data?.trang_thai === 'PROCESSING') {
        setSuccess('Hệ thống đang xử lý, kết quả sẽ tự cập nhật.');
        await pollAnalysisResult(selectedCvId, selectedJdId, startedAt);
      } else {
        setSuccess('Phân tích hoàn tất.');
      }
      await refreshHistory(selectedCvId);
    } catch (apiError) {
      if (apiError.code === 'ECONNABORTED') {
        setSuccess('Phân tích đang chạy nền. Trang sẽ tự cập nhật.');
        await pollAnalysisResult(selectedCvId, selectedJdId, startedAt);
      } else {
        setError(apiError.response?.data?.detail || 'Không thể phân tích CV/JD.');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReadResult = async (resultId) => {
    if (readInfo?.resultId === resultId) {
      setReadInfo(null);
      setLatestResult(null);
      setResultId(null);
      return;
    }
    setError('');
    setSuccess('');
    try {
      const response = await api.get(`/analysis/result/${resultId}`);
      const result = response.data;
      const cv = cvs.find((item) => item.cv_id === result.cv_id);
      const jd = jds.find((item) => item.jd_id === result.jd_id);
      setLatestResult(result);
      setChatContext({
        resultId: result.result_id,
        cvLabel: cv?.du_lieu_trich_xuat?.source_file || cv?.duong_dan || '',
        jdTitle: jd?.tieu_de || '',
      });
      setReadInfo({
        resultId: result.result_id,
        cvText: cv?.du_lieu_trich_xuat?.raw_text || 'Không có dữ liệu trích xuất CV.',
        jdText: jd?.noi_dung || 'Không có nội dung JD.',
      });
      setSuccess('Đã mở lại kết quả phân tích.');
    } catch (apiError) {
      setError(apiError.response?.data?.detail || 'Không thể đọc kết quả.');
    }
  };

  const handleDeleteResult = async (resultId) => {
    if (!window.confirm('Bạn có chắc muốn xóa kết quả phân tích này?')) return;
    try {
      await api.delete(`/analysis/result/${resultId}`);
      if (latestResult?.result_id === resultId) setLatestResult(null);
      if (readInfo?.resultId === resultId) setReadInfo(null);
      await refreshHistory(selectedCvId);
      setSuccess('Đã xóa kết quả phân tích.');
    } catch (apiError) {
      setError(apiError.response?.data?.detail || 'Không thể xóa kết quả.');
    }
  };

  if (loadingSource) {
    return <div className="panel grid min-h-[520px] place-items-center text-lg text-slate-500">Đang tải dữ liệu CV/JD...</div>;
  }

  const details = latestResult?.chi_tiet_diem || [];

  return (
    <div className="workspace-grid">
      <section className="panel source-panel">
        <div className="source-head">
          <div>
            <h2 className="text-xl font-extrabold">Source Document</h2>
            <p className="subtle text-sm">{selectedCv?.du_lieu_trich_xuat?.source_file || 'Chưa chọn CV'}</p>
          </div>
          <span className="chip">{selectedJd?.tieu_de || 'No JD'}</span>
        </div>
        <div className="source-canvas">
          <div className="scan-frame">
            <div className="scan-line" />
            <div className="absolute inset-x-9 top-12 space-y-5 text-sm text-slate-500">
              <div className="rounded-2xl bg-white/70 p-5">
                <p className="font-extrabold text-slate-800">CV</p>
                <p className="mt-2 line-clamp-6">{selectedCv?.du_lieu_trich_xuat?.raw_text || 'Chưa có nội dung trích xuất.'}</p>
              </div>
              <div className="rounded-2xl bg-white/70 p-5">
                <p className="font-extrabold text-slate-800">JD</p>
                <p className="mt-2 line-clamp-6">{selectedJd?.noi_dung || 'Chưa có nội dung JD.'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="section-title">Analysis<br />{latestResult ? 'Complete' : 'Workspace'}</h1>
            <p className="subtle mt-3 text-lg">
              {latestResult ? 'Processed via CV Intelligence Core v2.4' : 'Chọn CV và JD để bắt đầu phân tích.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={runAnalysis} disabled={!canAnalyze} className="btn-soft">
              {analyzing ? 'Đang phân tích...' : 'Phân tích lại'}
            </button>
            <button onClick={runAnalysis} disabled={!canAnalyze} className="btn-primary">
              Chấm điểm
            </button>
          </div>
        </div>

        <div className="panel-flat grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-bold text-slate-700">Chọn CV</span>
            <select value={selectedCvId} onChange={(event) => setSelectedCvId(event.target.value)} className="input-control">
              {cvs.length === 0 && <option value="">Chưa có CV</option>}
              {cvs.map((cv) => (
                <option key={cv.cv_id} value={cv.cv_id}>{cv.du_lieu_trich_xuat?.source_file || cv.duong_dan}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold text-slate-700">Chọn JD</span>
            <select value={selectedJdId} onChange={(event) => setSelectedJdId(event.target.value)} className="input-control">
              {jds.length === 0 && <option value="">Chưa có JD</option>}
              {jds.map((jd) => (
                <option key={jd.jd_id} value={jd.jd_id}>{jd.tieu_de}</option>
              ))}
            </select>
          </label>
        </div>

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700">{error}</div>}
        {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700">{success}</div>}
        {isPollingResult && <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-blue-700">Đang tự động kiểm tra kết quả phân tích...</div>}

        {latestResult ? (
          <>
            <div className="panel border-l-4 border-l-[#0b45d9] p-8">
              <div className="mb-6 flex items-center gap-3">
                <span className="text-[#0b45d9]">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                    <path d="M14 2v6h6" />
                  </svg>
                </span>
                <h2 className="text-2xl font-extrabold">Tóm tắt nội dung</h2>
              </div>
              <div className="prose max-w-none text-lg leading-8 text-slate-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{latestResult.goi_y || 'Không có gợi ý.'}</ReactMarkdown>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
              <div className="panel p-8">
                <div className="mb-6 flex items-center gap-3">
                  <span className="text-[#0b45d9]">▧</span>
                  <h2 className="text-2xl font-extrabold">Thực thể được nhận diện</h2>
                </div>
                <div className="space-y-4">
                  {details.slice(0, 3).map((detail, index) => <DetailCard key={`${detail.tieu_chi}-${index}`} detail={detail} index={index} />)}
                </div>
              </div>

              <div className="panel grid place-items-center p-8 text-center">
                <div>
                  <h2 className="mb-8 text-2xl font-extrabold">Đánh giá Độ tin cậy</h2>
                  <ScoreRing score={latestResult.diem_tong} />
                  <p className="subtle mt-8">Mức độ phù hợp được tính từ kỹ năng, kinh nghiệm và học vấn.</p>
                </div>
              </div>
            </div>

            {readInfo && (
              <div className="panel border-cyan-200 p-7">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-extrabold">AI Insights</h2>
                  <button onClick={() => setReadInfo(null)} className="btn-soft">Đóng</button>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="max-h-72 overflow-y-auto rounded-2xl bg-[#f4f8ff] p-5 text-sm whitespace-pre-line modern-scrollbar">{readInfo.cvText}</div>
                  <div className="max-h-72 overflow-y-auto rounded-2xl bg-[#f4f8ff] p-5 text-sm whitespace-pre-line modern-scrollbar">{readInfo.jdText}</div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="panel p-10">
            <h2 className="text-2xl font-extrabold">Sẵn sàng phân tích</h2>
            <p className="subtle mt-3 text-lg">Cần có ít nhất 1 CV và 1 JD. Sau khi chấm điểm, kết quả sẽ hiển thị theo dạng báo cáo như thiết kế mẫu.</p>
          </div>
        )}

        <div className="panel p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-extrabold">Result History</h2>
            <span className="chip">{resultHistory.length} reports</span>
          </div>
          {resultHistory.length === 0 ? (
            <p className="subtle">Chưa có kết quả phân tích cho CV đã chọn.</p>
          ) : (
            <div className="space-y-3">
              {resultHistory.map((result) => {
                const jd = jds.find((item) => item.jd_id === result.jd_id);
                return (
                  <div key={result.result_id} className="flex flex-col gap-4 rounded-2xl border border-[#dce4f3] px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-bold">JD: {jd?.tieu_de || 'Không tìm thấy JD'}</p>
                      <p className="subtle mt-1 text-sm">{result.trang_thai} · {result.diem_tong ? Number(result.diem_tong).toFixed(2) : '--'} điểm</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleReadResult(result.result_id)} className="btn-soft">Xem chi tiết</button>
                      <button onClick={() => handleDeleteResult(result.result_id)} className="btn-danger">Xóa</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default MatchingPage;
