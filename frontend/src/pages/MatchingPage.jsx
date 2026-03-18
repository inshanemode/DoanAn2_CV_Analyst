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

    try {
      const payload = {
        cv_id: selectedCvId,
        jd_id: selectedJdId,
      };

      const response = await api.post('/analysis/', payload);
      setLatestResult(response.data);
      setSuccess('Phân tích hoàn tất.');

      await refreshHistory(selectedCvId);
    } catch (apiError) {
      setError(apiError.response?.data?.detail || 'Không thể phân tích CV/JD.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReadResult = async (resultId) => {
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
        alignedSections: buildAlignedSections(cvRawText, jdRawText),
      });

      setSuccess('Đã đọc lại thông tin CV/JD trích xuất.');
    } catch (apiError) {
      setError(apiError.response?.data?.detail || 'Không thể đọc chi tiết kết quả.');
    }
  };

  const handleUpdateSelection = (result) => {
    setSelectedCvId(result.cv_id);
    setSelectedJdId(result.jd_id);
    setError('');
    setSuccess('Đã nạp lại cặp CV/JD vào bộ chọn. Bạn có thể đổi CV hoặc JD khác rồi bấm Chấm điểm.');
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

  const buildAlignedSections = (cvText, jdText) => {
    const splitLines = (text) =>
      (text || '')
        .split(/\n|\.|;/g)
        .map((line) => line.trim())
        .filter(Boolean);

    const pickByKeywords = (lines, keywords) => {
      const lowerKeywords = keywords.map((keyword) => keyword.toLowerCase());
      const matched = lines.filter((line) => {
        const lowered = line.toLowerCase();
        return lowerKeywords.some((keyword) => lowered.includes(keyword));
      });
      if (matched.length > 0) return matched.slice(0, 3).join('\n• ');
      return lines.slice(0, 2).join('\n• ');
    };

    const overlapRatio = (left, right) => {
      const normalize = (text) =>
        new Set(
          (text || '')
            .toLowerCase()
            .split(/[^\p{L}\p{N}+#./-]+/u)
            .map((token) => token.trim())
            .filter((token) => token.length >= 3),
        );
      const leftSet = normalize(left);
      const rightSet = normalize(right);
      if (leftSet.size === 0 || rightSet.size === 0) return 0;
      let common = 0;
      leftSet.forEach((item) => {
        if (rightSet.has(item)) common += 1;
      });
      return common / Math.max(rightSet.size, 1);
    };

    const cvLines = splitLines(cvText);
    const jdLines = splitLines(jdText);

    const sectionConfig = [
      {
        key: 'skills',
        title: 'Kỹ năng chuyên môn',
        keywords: ['kỹ năng', 'skill', 'technology', 'framework', 'ngôn ngữ', 'stack', 'tool'],
      },
      {
        key: 'experience',
        title: 'Kinh nghiệm làm việc',
        keywords: ['kinh nghiệm', 'experience', 'năm', 'year', 'dự án', 'project', 'work'],
      },
      {
        key: 'education',
        title: 'Học vấn & Chứng chỉ',
        keywords: ['học vấn', 'education', 'đại học', 'bachelor', 'master', 'chứng chỉ', 'certificate'],
      },
    ];

    return sectionConfig.map((section) => {
      const cvPart = pickByKeywords(cvLines, section.keywords);
      const jdPart = pickByKeywords(jdLines, section.keywords);
      const ratio = overlapRatio(cvPart, jdPart);

      let summary = 'Khớp thấp, nên bổ sung thêm thông tin liên quan mục này.';
      if (ratio >= 0.6) {
        summary = 'Khớp tốt giữa CV và JD ở mục này.';
      } else if (ratio >= 0.35) {
        summary = 'Khớp trung bình, cần làm rõ thêm từ khóa liên quan.';
      }

      return {
        key: section.key,
        title: section.title,
        cvPart: cvPart ? `• ${cvPart}` : '• Chưa có dữ liệu rõ ràng trong CV.',
        jdPart: jdPart ? `• ${jdPart}` : '• Chưa có dữ liệu rõ ràng trong JD.',
        ratio,
        summary,
      };
    });
  };

  if (loadingSource) {
    return (
      <div className="mac-glass rounded-[20px] p-[24px] min-h-[400px] flex items-center justify-center text-gray-500">
        Đang tải dữ liệu CV/JD...
      </div>
    );
  }

  return (
    <>
      <div className="mac-glass rounded-[20px] p-[24px] min-h-[400px] flex flex-col gap-5">
        <div className="flex justify-between items-center border-b border-black/5 pb-4">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Phân tích & So khớp CV - JD</h1>
          <button
            onClick={runAnalysis}
            disabled={!canAnalyze}
            className="mac-button px-[20px] py-[10px] text-base font-bold transition-colors shadow-sm disabled:opacity-60"
          >
            {analyzing ? 'Đang phân tích...' : 'Chấm điểm'}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Chọn CV</label>
            <select
              value={selectedCvId}
              onChange={(event) => setSelectedCvId(event.target.value)}
              className="w-full rounded-xl border border-black/10 px-4 py-3 bg-white outline-none focus:border-blue-400"
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">Chọn JD</label>
            <select
              value={selectedJdId}
              onChange={(event) => setSelectedJdId(event.target.value)}
              className="w-full rounded-xl border border-black/10 px-4 py-3 bg-white outline-none focus:border-blue-400"
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
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-700">
            Cần có ít nhất 1 CV và 1 JD để thực hiện chấm điểm.
          </div>
        )}

        {latestResult && (
          <div className="rounded-2xl border border-black/10 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-gray-900">Kết quả mới nhất</h2>
              <span className={`text-3xl font-extrabold ${scoreColorClass(latestResult.diem_tong)}`}>
                {formatScore(latestResult.diem_tong)}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              {(latestResult.chi_tiet_diem || []).map((detail, index) => (
                <div key={`${detail.tieu_chi}-${index}`} className="rounded-xl border border-black/10 px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-gray-900">{detail.tieu_chi}</p>
                    <p className={`font-bold ${scoreColorClass(detail.diem)}`}>{formatScore(detail.diem)}</p>
                  </div>
                  <p className="text-sm text-gray-600">{detail.nhan_xet}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-black/[0.03] px-4 py-3">
              <p className="text-sm font-semibold text-gray-700 mb-1">Gợi ý cải thiện</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">{latestResult.goi_y || 'Không có gợi ý.'}</p>
            </div>
          </div>
        )}

        {readInfo && (
          <div className="rounded-2xl border border-black/10 bg-white p-5">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Thông tin trích xuất (R)</h2>
            <div className="space-y-3 mb-4">
              {(readInfo.alignedSections || []).map((section) => (
                <div key={section.key} className="rounded-xl border border-black/10 p-4 bg-black/[0.02]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-gray-800">{section.title}</p>
                    <span className="text-xs font-semibold text-gray-600">{section.summary}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-lg bg-white border border-black/10 p-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1">CV</p>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{section.cvPart}</p>
                    </div>
                    <div className="rounded-lg bg-white border border-black/10 p-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1">JD</p>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{section.jdPart}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-black/10 p-4 bg-black/[0.02]">
                <p className="text-sm font-semibold text-gray-700 mb-2">Toàn văn CV: {readInfo.cvFile}</p>
                <div className="max-h-48 overflow-y-auto whitespace-pre-line text-sm text-gray-700">
                  {readInfo.cvText}
                </div>
              </div>
              <div className="rounded-xl border border-black/10 p-4 bg-black/[0.02]">
                <p className="text-sm font-semibold text-gray-700 mb-2">Toàn văn JD: {readInfo.jdTitle}</p>
                <div className="max-h-48 overflow-y-auto whitespace-pre-line text-sm text-gray-700">
                  {readInfo.jdText}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-black/10 bg-white p-5">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Lịch sử phân tích theo CV đã chọn</h2>
          {resultHistory.length === 0 ? (
            <p className="text-gray-500">Chưa có kết quả phân tích cho CV này.</p>
          ) : (
            <div className="space-y-2">
              {resultHistory.map((result) => (
                <div key={result.result_id} className="rounded-xl border border-black/10 px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900">Result: {result.result_id}</p>
                      <p className="text-sm text-gray-500">Trạng thái: {result.trang_thai}</p>
                    </div>
                    <p className={`text-xl font-extrabold ${scoreColorClass(result.diem_tong)}`}>
                      {formatScore(result.diem_tong)}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleReadResult(result.result_id)}
                      className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-black/5"
                    >
                      R - Read
                    </button>
                    <button
                      onClick={() => handleUpdateSelection(result)}
                      className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      U - Update
                    </button>
                    <button
                      onClick={() => handleDeleteResult(result.result_id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      D - Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedCv && (
          <p className="text-xs text-gray-500">
            CV đang chọn: {(selectedCv.du_lieu_trich_xuat?.source_file || selectedCv.duong_dan).slice(0, 120)}
            {selectedJd ? ` | JD đang chọn: ${selectedJd.tieu_de}` : ''}
          </p>
        )}
      </div>
    </>
  );
}

export default MatchingPage;
