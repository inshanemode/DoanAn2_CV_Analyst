import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

// Common Stats Component
const StatsRow = ({ stats }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
    <div className="mac-glass rounded-2xl p-[20px] transition-transform duration-300 hover:-translate-y-1 cursor-default">
      <div className="text-base font-bold text-gray-500 mb-2 uppercase tracking-wide">Tổng Số CV</div>
      <div className="text-4xl font-bold text-blue-600 tracking-tight">{stats.totalCvs}</div>
    </div>
    <div className="mac-glass rounded-2xl p-[20px] transition-transform duration-300 hover:-translate-y-1 cursor-default">
      <div className="text-base font-bold text-gray-500 mb-2 uppercase tracking-wide">Công Việc (JD)</div>
      <div className="text-4xl font-bold text-blue-600 tracking-tight">{stats.totalJds}</div>
    </div>
    <div className="mac-glass rounded-2xl p-[20px] transition-transform duration-300 hover:-translate-y-1 cursor-default">
      <div className="text-base font-bold text-gray-500 mb-2 uppercase tracking-wide">Đã Phân Tích</div>
      <div className="text-4xl font-bold text-blue-600 tracking-tight">{stats.analyzed}</div>
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

      <div className="mac-glass rounded-[20px] p-[24px] min-h-[400px] flex flex-col">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={handleUpload}
        />

        <div className="flex justify-between items-center mb-6 border-b border-black/5 pb-4">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Hồ sơ ứng viên
          </h1>
          <button
            onClick={handleAction}
            disabled={uploading}
            className="mac-button px-[20px] py-[10px] text-base font-bold transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60"
          >
            <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            {uploading ? 'Đang tải...' : 'Tải lên CV'}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            {success}
          </div>
        )}

        {cvs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 border border-dashed border-black/10 rounded-2xl bg-black/[0.02] hover:bg-black/[0.04] transition-colors cursor-pointer group" onClick={handleAction}>
            <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-250 shadow-sm border border-black/5">
              <svg className="w-8 h-8 mac-subtitle group-hover:text-[#0071e3] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Chưa có dữ liệu</h3>
            <p className="text-base text-gray-500 max-w-md font-medium">
              Kéo thả file vào khu vực này hoặc click nút Tải lên CV để thêm hồ sơ đầu tiên vào hệ thống.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {cvs.map((cv) => (
              <div key={cv.cv_id} className="rounded-xl border border-black/10 bg-white px-4 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{cv.du_lieu_trich_xuat?.source_file || cv.duong_dan}</p>
                  <p className="text-sm text-gray-500">ID: {cv.cv_id}</p>
                </div>
                <span className="text-sm font-semibold text-blue-600">{cv.trang_thai_phan_tich}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default CvPage;
