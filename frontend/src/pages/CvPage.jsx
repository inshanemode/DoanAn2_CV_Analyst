import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

function FileIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h5" />
    </svg>
  );
}

function StatusChip({ status }) {
  const tone = status === 'DONE'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : status === 'FAILED'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : 'border-amber-200 bg-amber-50 text-amber-700';
  return <span className={`rounded-full border px-3 py-1 text-xs font-bold ${tone}`}>{status}</span>;
}

function CvPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [cvs, setCvs] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedCv = cvs.find((item) => item.cv_id === selectedId) || cvs[0];

  const fetchCvs = async () => {
    if (!user) return;
    try {
      const response = await api.get('/cvs/');
      const data = response.data || [];
      setCvs(data);
      if (data.length && !selectedId) setSelectedId(data[0].cv_id);
    } catch (apiError) {
      setError(apiError.response?.data?.detail || 'Không thể tải danh sách CV.');
    }
  };

  useEffect(() => {
    fetchCvs();
  }, [user]);

  const requireLoginOrUpload = () => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    fileInputRef.current?.click();
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
      setSuccess('Tải CV thành công. Hệ thống đã trích xuất nội dung.');
      await fetchCvs();
    } catch (apiError) {
      setError(apiError.response?.data?.detail || 'Tải CV thất bại.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDeleteCv = async (cvId) => {
    if (!window.confirm('Bạn có chắc muốn xóa CV này?')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/cvs/${cvId}`);
      setSuccess('Đã xóa CV.');
      setSelectedId('');
      await fetchCvs();
    } catch (apiError) {
      setError(apiError.response?.data?.detail || 'Không thể xóa CV.');
    }
  };

  return (
    <div className="workspace-grid">
      <section className="panel source-panel">
        <div className="source-head">
          <div>
            <h2 className="text-xl font-extrabold">Source Document</h2>
            <p className="subtle text-sm">CV upload and extracted text</p>
          </div>
          <span className="chip max-w-[220px] truncate">
            {selectedCv?.du_lieu_trich_xuat?.source_file || 'No file selected'}
          </span>
        </div>
        <div className="source-canvas">
          <div className="scan-frame">
            <div className="scan-line" />
            <div className="absolute inset-x-10 top-20 space-y-4 opacity-55">
              <div className="h-4 rounded-full bg-white/80" />
              <div className="h-4 w-4/5 rounded-full bg-white/70" />
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="h-20 rounded-xl bg-white/60" />
                <div className="h-20 rounded-xl bg-white/60" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-7">
        <input ref={fileInputRef} type="file" accept=".pdf,.docx,image/*" className="hidden" onChange={handleUpload} />

        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="section-title">CV Dashboard</h1>
            <p className="subtle mt-3 text-lg">Quản lý hồ sơ ứng viên, trạng thái trích xuất và dữ liệu nguồn.</p>
          </div>
          <button onClick={requireLoginOrUpload} disabled={uploading} className="btn-primary">
            <FileIcon />
            {uploading ? 'Đang tải...' : 'Upload CV'}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="metric-card">
            <p className="subtle text-sm font-bold uppercase">Tổng CV</p>
            <p className="mt-2 text-5xl font-extrabold text-[#0b45d9]">{cvs.length}</p>
          </div>
          <div className="metric-card">
            <p className="subtle text-sm font-bold uppercase">Đã xử lý</p>
            <p className="mt-2 text-5xl font-extrabold text-[#15b8d4]">{cvs.filter((cv) => cv.trang_thai_phan_tich === 'DONE').length}</p>
          </div>
          <div className="metric-card">
            <p className="subtle text-sm font-bold uppercase">Định dạng</p>
            <p className="mt-4 text-2xl font-extrabold">PDF / DOCX / Image</p>
          </div>
        </div>

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700">{error}</div>}
        {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700">{success}</div>}

        <div className="panel p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold">Danh sách hồ sơ</h2>
              <p className="subtle mt-1">Chọn một CV để xem bản xem trước trích xuất.</p>
            </div>
            <span className="chip">PDF, Word và ảnh</span>
          </div>

          {cvs.length === 0 ? (
            <button onClick={requireLoginOrUpload} className="w-full rounded-[20px] border border-dashed border-[#b9c9e7] bg-[#f4f8ff] px-8 py-16 text-center">
              <p className="text-2xl font-extrabold">Chưa có dữ liệu</p>
              <p className="subtle mt-2">Nhấn để upload CV đầu tiên.</p>
            </button>
          ) : (
            <div className="space-y-3">
              {cvs.map((cv) => (
                <div
                  key={cv.cv_id}
                  className={`flex flex-col gap-4 rounded-2xl border px-5 py-4 md:flex-row md:items-center md:justify-between ${
                    selectedCv?.cv_id === cv.cv_id ? 'border-[#0b45d9] bg-[#f4f8ff]' : 'border-[#dce4f3] bg-white'
                  }`}
                >
                  <button type="button" onClick={() => setSelectedId(cv.cv_id)} className="min-w-0 text-left">
                    <p className="truncate text-lg font-bold">{cv.du_lieu_trich_xuat?.source_file || cv.duong_dan}</p>
                    <p className="subtle mt-1 break-all text-sm">{cv.cv_id}</p>
                  </button>
                  <div className="flex items-center gap-3">
                    <StatusChip status={cv.trang_thai_phan_tich} />
                    <button type="button" onClick={() => handleDeleteCv(cv.cv_id)} className="btn-danger">Xóa</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default CvPage;
