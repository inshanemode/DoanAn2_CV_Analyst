import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

// Common Stats Component duplicated for demo (can be moved to a shared component later)
const StatsRow = ({ stats }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-7">
    <div className="mac-glass rounded-2xl p-[24px] transition-transform duration-300 hover:-translate-y-1 cursor-default">
      <div className="text-lg font-bold text-gray-500 mb-2 uppercase tracking-wide">Tổng Số CV</div>
      <div className="text-5xl md:text-6xl font-bold text-blue-600 tracking-tight">{stats.totalCvs}</div>
    </div>
    <div className="mac-glass rounded-2xl p-[24px] transition-transform duration-300 hover:-translate-y-1 cursor-default">
      <div className="text-lg font-bold text-gray-500 mb-2 uppercase tracking-wide">Công Việc (JD)</div>
      <div className="text-5xl md:text-6xl font-bold text-blue-600 tracking-tight">{stats.totalJds}</div>
    </div>
    <div className="mac-glass rounded-2xl p-[24px] transition-transform duration-300 hover:-translate-y-1 cursor-default">
      <div className="text-lg font-bold text-gray-500 mb-2 uppercase tracking-wide">Đã Phân Tích</div>
      <div className="text-5xl md:text-6xl font-bold text-blue-600 tracking-tight">{stats.analyzed}</div>
    </div>
  </div>
);

function JdPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [jds, setJds] = useState([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const stats = {
    totalCvs: 0,
    totalJds: jds.length,
    analyzed: 0,
  };

  const fetchJds = async () => {
    if (!user) return;
    try {
      const response = await api.get('/jds/');
      setJds(response.data || []);
    } catch (apiError) {
      setError(apiError.response?.data?.detail || 'Không thể tải danh sách JD.');
    }
  };

  useEffect(() => {
    fetchJds();
  }, [user]);

  const handleDeleteJd = async (jdId) => {
    const confirmed = window.confirm('Bạn có chắc muốn xóa JD này?');
    if (!confirmed) return;

    setError('');
    setSuccess('');
    try {
      await api.delete(`/jds/${jdId}`);
      setSuccess('Đã xóa JD.');
      await fetchJds();
    } catch (apiError) {
      setError(apiError.response?.data?.detail || 'Không thể xóa JD.');
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setError('Vui lòng chọn file JD (.pdf hoặc .docx).');
      return;
    }

    setError('');
    setSuccess('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (title.trim()) {
        formData.append('tieu_de', title.trim());
      }
      if (company.trim()) {
        formData.append('ten_cong_ty', company.trim());
      }

      await api.post('/jds/upload', formData);
      setSuccess('Tải JD thành công.');
      setShowUploadForm(false);
      setSelectedFile(null);
      setTitle('');
      setCompany('');
      await fetchJds();
    } catch (apiError) {
      setError(apiError.response?.data?.detail || 'Tải JD thất bại.');
    } finally {
      setUploading(false);
    }
  };

  const handleAction = () => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    setError('');
    setSuccess('');
    setShowUploadForm((prev) => !prev);
  };

  const handleCancelUpload = () => {
    setShowUploadForm(false);
    setSelectedFile(null);
    setTitle('');
    setCompany('');
    setError('');
  };

  return (
    <>
      <StatsRow stats={stats} />

      <div className="mac-glass rounded-[20px] p-[32px] min-h-[520px] flex flex-col text-base md:text-lg">
        <div className="flex justify-between items-center mb-8 border-b border-black/5 pb-5">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
            Mô tả công việc (Job Descriptions)
          </h1>
          <button
            onClick={handleAction}
            disabled={uploading}
            className="mac-button px-6 py-3 text-lg font-bold transition-colors shadow-sm flex items-center gap-3 disabled:opacity-60"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            {showUploadForm ? 'Ẩn form tải JD' : 'Tải JD file'}
          </button>
        </div>

        <div className="mb-4">
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-base font-medium text-blue-700">
            Chỉ hỗ trợ file PDF và Word (.docx)
          </span>
        </div>

        {showUploadForm && (
          <form onSubmit={handleUpload} className="rounded-2xl border border-black/10 bg-white p-6 mb-5 space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Form tải tài liệu JD</h2>

            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">Tài liệu JD (.pdf, .docx)</label>
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                className="w-full rounded-xl border border-black/10 px-4 py-3 bg-white text-base outline-none focus:border-blue-400"
              />
              {selectedFile && (
                <p className="mt-2 text-sm text-gray-600">Đã chọn: {selectedFile.name}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-2">Tên JD (tuỳ chọn)</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ví dụ: Backend Python Developer"
                  className="w-full rounded-xl border border-black/10 px-5 py-4 text-lg outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-2">Tên công ty (tuỳ chọn)</label>
                <input
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  placeholder="Ví dụ: ABC Tech"
                  className="w-full rounded-xl border border-black/10 px-5 py-4 text-lg outline-none focus:border-blue-400"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={uploading}
                className="inline-flex items-center rounded-full bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {uploading ? 'Đang tải...' : 'Xác nhận tải lên'}
              </button>
              <button
                type="button"
                onClick={handleCancelUpload}
                disabled={uploading}
                className="inline-flex items-center rounded-full bg-gray-100 px-6 py-3 text-base font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-60"
              >
                Hủy
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-600 text-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-green-700 text-lg">
            {success}
          </div>
        )}

        {jds.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-14 border border-dashed border-black/10 rounded-2xl bg-black/[0.02] hover:bg-black/[0.04] transition-colors cursor-pointer group" onClick={handleAction}>
            <div className="w-20 h-20 rounded-full bg-black/5 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-250 shadow-sm border border-black/5">
              <svg className="w-10 h-10 mac-subtitle group-hover:text-[#0071e3] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-3">Chưa có dữ liệu</h3>
            <p className="text-xl text-gray-500 max-w-2xl font-medium">
              Hãy nhấn Tải JD file để mở form, nhập thông tin và xác nhận tải tài liệu JD.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {jds.map((jd) => (
              <div key={jd.jd_id} className="rounded-2xl border border-black/10 bg-white px-6 py-5 flex items-center justify-between gap-5">
                <div className="min-w-0">
                  <p className="text-xl font-semibold text-gray-900 truncate">{jd.tieu_de}</p>
                  <p className="text-base text-gray-500 truncate">{jd.ten_cong_ty || 'Không có công ty'}</p>
                  <p className="text-base text-gray-400">ID: {jd.jd_id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteJd(jd.jd_id)}
                  className="inline-flex items-center rounded-full bg-red-600 px-5 py-2.5 text-base font-semibold text-white hover:bg-red-700 flex-shrink-0"
                >
                  Xóa JD
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default JdPage;
