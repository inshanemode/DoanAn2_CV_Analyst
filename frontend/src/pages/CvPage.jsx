import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

// Common Stats Component
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

function CvPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const [cvs, setCvs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const stats = {
    totalCvs: cvs.length,
    totalJds: 0,
    analyzed: cvs.filter((cv) => cv.trang_thai_phan_tich === 'DONE').length,
  };

  const fetchCvs = async () => {
    if (!user) return;
    try {
      const response = await api.get('/cvs/');
      setCvs(response.data || []);
    } catch (apiError) {
      setError(apiError.response?.data?.detail || 'Không thể tải danh sách CV.');
    }
  };

  useEffect(() => {
    fetchCvs();
  }, [user]);

  const handleDeleteCv = async (cvId) => {
    const confirmed = window.confirm('Bạn có chắc muốn xóa CV này?');
    if (!confirmed) return;

    setError('');
    setSuccess('');
    try {
      await api.delete(`/cvs/${cvId}`);
      setSuccess('Đã xóa CV.');
      await fetchCvs();
    } catch (apiError) {
      setError(apiError.response?.data?.detail || 'Không thể xóa CV.');
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post('/cvs/', formData);
      setSuccess('Tải CV thành công.');
      await fetchCvs();
    } catch (apiError) {
      setError(apiError.response?.data?.detail || 'Tải CV thất bại.');
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleAction = () => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <>
      <StatsRow stats={stats} />

      <div className="mac-glass rounded-[20px] p-[32px] min-h-[520px] flex flex-col text-base md:text-lg">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={handleUpload}
        />

        <div className="flex justify-between items-center mb-8 border-b border-black/5 pb-5">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
            Hồ sơ ứng viên
          </h1>
          <button
            onClick={handleAction}
            disabled={uploading}
            className="mac-button px-6 py-3 text-lg font-bold transition-colors shadow-sm flex items-center gap-3 disabled:opacity-60"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            {uploading ? 'Đang tải...' : 'Tải lên CV'}
          </button>
        </div>

        <div className="mb-4">
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-base font-medium text-blue-700">
            Chỉ hỗ trợ file PDF và Word (.docx)
          </span>
        </div>

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

        {cvs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-14 border border-dashed border-black/10 rounded-2xl bg-black/[0.02] hover:bg-black/[0.04] transition-colors cursor-pointer group" onClick={handleAction}>
            <div className="w-20 h-20 rounded-full bg-black/5 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-250 shadow-sm border border-black/5">
              <svg className="w-10 h-10 mac-subtitle group-hover:text-[#0071e3] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-3">Chưa có dữ liệu</h3>
            <p className="text-xl text-gray-500 max-w-2xl font-medium">
              Kéo thả file vào khu vực này hoặc click nút Tải lên CV để thêm hồ sơ đầu tiên vào hệ thống.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {cvs.map((cv) => (
              <div key={cv.cv_id} className="rounded-2xl border border-black/10 bg-white px-6 py-5 flex items-center justify-between gap-5">
                <div className="min-w-0">
                  <p className="text-xl font-semibold text-gray-900 truncate">{cv.du_lieu_trich_xuat?.source_file || cv.duong_dan}</p>
                  <p className="text-base text-gray-500">ID: {cv.cv_id}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Trạng thái: <span className="font-semibold text-blue-600">{cv.trang_thai_phan_tich}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteCv(cv.cv_id)}
                  className="inline-flex items-center rounded-full bg-red-600 px-5 py-2.5 text-base font-semibold text-white hover:bg-red-700 flex-shrink-0"
                >
                  Xóa CV
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </>
  );
}

export default CvPage;
