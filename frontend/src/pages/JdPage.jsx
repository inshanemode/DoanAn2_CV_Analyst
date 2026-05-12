import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

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

  const handleAction = () => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    setShowUploadForm((prev) => !prev);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setError('Vui lòng chọn file JD (.pdf, .docx hoặc ảnh).');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (title.trim()) formData.append('tieu_de', title.trim());
      if (company.trim()) formData.append('ten_cong_ty', company.trim());
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

  const handleDeleteJd = async (jdId) => {
    if (!window.confirm('Bạn có chắc muốn xóa JD này?')) return;
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

  return (
    <div className="workspace-grid">
      <section className="panel source-panel">
        <div className="source-head">
          <div>
            <h2 className="text-xl font-extrabold">Archive</h2>
            <p className="subtle text-sm">Job descriptions repository</p>
          </div>
          <span className="chip">{jds.length} records</span>
        </div>
        <div className="source-canvas">
          <div className="w-full max-w-[430px] space-y-4">
            {jds.slice(0, 4).map((jd, index) => (
              <div key={jd.jd_id} className="rounded-2xl border border-[#d8e1f3] bg-white/80 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold">{jd.tieu_de}</p>
                    <p className="subtle mt-1 text-sm">{jd.ten_cong_ty || 'Chưa có công ty'}</p>
                  </div>
                  <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-bold text-[#0b45d9]">JD-{index + 1}</span>
                </div>
              </div>
            ))}
            {jds.length === 0 && (
              <div className="scan-frame flex items-center justify-center">
                <p className="subtle font-semibold">Upload JD để bắt đầu</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="section-title">Job Description Archive</h1>
            <p className="subtle mt-3 text-lg">Lưu trữ JD để phục vụ phân tích và so khớp ứng viên.</p>
          </div>
          <button onClick={handleAction} disabled={uploading} className="btn-primary">
            {showUploadForm ? 'Ẩn form' : 'Upload JD'}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="metric-card">
            <p className="subtle text-sm font-bold uppercase">Tổng JD</p>
            <p className="mt-2 text-5xl font-extrabold text-[#0b45d9]">{jds.length}</p>
          </div>
          <div className="metric-card">
            <p className="subtle text-sm font-bold uppercase">Nguồn</p>
            <p className="mt-4 text-2xl font-extrabold">PDF / DOCX / Image</p>
          </div>
          <div className="metric-card">
            <p className="subtle text-sm font-bold uppercase">Sẵn sàng</p>
            <p className="mt-2 text-5xl font-extrabold text-[#15b8d4]">{jds.length}</p>
          </div>
        </div>

        {showUploadForm && (
          <form onSubmit={handleUpload} className="panel p-6">
            <h2 className="text-2xl font-extrabold">Tải tài liệu JD</h2>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Tên JD</span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} className="input-control" placeholder="Backend Python Developer" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Tên công ty</span>
                <input value={company} onChange={(event) => setCompany(event.target.value)} className="input-control" placeholder="ABC Tech" />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-bold text-slate-700">Tài liệu JD</span>
                <input type="file" accept=".pdf,.docx,image/*" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} className="input-control py-3" />
              </label>
            </div>
            <div className="mt-5 flex gap-3">
              <button type="submit" disabled={uploading} className="btn-primary">{uploading ? 'Đang tải...' : 'Xác nhận'}</button>
              <button type="button" onClick={() => setShowUploadForm(false)} className="btn-soft">Hủy</button>
            </div>
          </form>
        )}

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700">{error}</div>}
        {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700">{success}</div>}

        <div className="panel p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-extrabold">Danh sách JD</h2>
            <span className="chip">Archive</span>
          </div>

          {jds.length === 0 ? (
            <button onClick={handleAction} className="w-full rounded-[20px] border border-dashed border-[#b9c9e7] bg-[#f4f8ff] px-8 py-16 text-center">
              <p className="text-2xl font-extrabold">Chưa có mô tả công việc</p>
              <p className="subtle mt-2">Nhấn để upload JD đầu tiên.</p>
            </button>
          ) : (
            <div className="space-y-3">
              {jds.map((jd) => (
                <div key={jd.jd_id} className="flex flex-col gap-4 rounded-2xl border border-[#dce4f3] bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold">{jd.tieu_de}</p>
                    <p className="subtle mt-1 truncate">{jd.ten_cong_ty || 'Chưa có công ty'}</p>
                    <p className="subtle mt-1 break-all text-sm">{jd.jd_id}</p>
                  </div>
                  <button type="button" onClick={() => handleDeleteJd(jd.jd_id)} className="btn-danger">Xóa</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default JdPage;
