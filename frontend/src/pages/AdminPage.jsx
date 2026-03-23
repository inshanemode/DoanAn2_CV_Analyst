import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

function TabDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Đang tải...</p>;
  if (!stats) return <p className="text-red-500">Không thể tải dữ liệu.</p>;

  const statCards = [
    { label: 'Tổng người dùng', value: stats.tong_nguoi_dung, color: 'text-blue-600' },
    { label: 'Tổng CV đã upload', value: stats.tong_cv, color: 'text-green-600' },
    { label: 'Tong JD', value: stats.tong_jd, color: 'text-purple-600' },
    { label: 'Tổng lượt phân tích', value: stats.tong_phan_tich, color: 'text-orange-600' },
    { label: 'Phân tích hôm nay', value: stats.phan_tich_hom_nay, color: 'text-pink-600' },
    { label: 'Điểm TB toàn hệ thống', value: stats.diem_trung_binh ? `${stats.diem_trung_binh}` : 'N/A', color: 'text-yellow-600' },
    { label: 'Người dùng mới 7 ngày', value: stats.nguoi_dung_moi_7_ngay, color: 'text-teal-600' },
  ];

  const maxVal = Math.max(...stats.phan_tich_7_ngay.map((d) => d.so_luong), 1);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-black/10 p-5 shadow-sm">
            <p className="text-sm text-gray-500 mb-1">{card.label}</p>
            <p className={`text-4xl font-bold tracking-tight ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-black/10 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Lượt phân tích 7 ngày qua</h3>
        <div className="flex items-end gap-3 h-40">
          {stats.phan_tich_7_ngay.map((d) => (
            <div key={d.ngay} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-500 font-medium">{d.so_luong}</span>
              <div
                className="w-full bg-blue-500 rounded-t-lg transition-all duration-500"
                style={{ height: `${(d.so_luong / maxVal) * 120 + 4}px`, minHeight: '4px' }}
              />
              <span className="text-xs text-gray-400">{d.ngay}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState(null);

  const fetchUsers = (q = '') => {
    setLoading(true);
    api.get(`/admin/users?search=${q}&limit=100`)
      .then((r) => setUsers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggle = async (userId, currentStatus) => {
    setToggling(userId);
    try {
      await api.patch(`/admin/users/${userId}/toggle`, { hoat_dong: !currentStatus });
      setUsers((prev) => prev.map((u) => (
        u.user_id === userId ? { ...u, hoat_dong: !currentStatus } : u
      )));
    } catch {
      alert('Không thể thay đổi trạng thái tài khoản.');
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-4">
      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          fetchUsers(e.target.value);
        }}
        placeholder="Tìm kiếm theo tên hoặc email..."
        className="w-full max-w-md rounded-xl border border-black/10 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
      />

      {loading ? (
        <p className="text-gray-500 text-sm">Đang tải...</p>
      ) : (
        <div className="bg-white rounded-2xl border border-black/10 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-black/10">
              <tr>
                {['Họ tên', 'Email', 'Vai trò', 'CV', 'JD', 'Phân tích', 'Ngày tạo', 'Trạng thái', 'Hành động'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-gray-600 font-semibold text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.user_id} className={`border-b border-black/5 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{u.ho_ten}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.vai_tro === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {u.vai_tro}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">{u.so_cv}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{u.so_jd}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{u.so_phan_tich}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.hoat_dong ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.hoat_dong ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.vai_tro !== 'ADMIN' && (
                      <button
                        onClick={() => handleToggle(u.user_id, u.hoat_dong)}
                        disabled={toggling === u.user_id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${u.hoat_dong ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                      >
                        {toggling === u.user_id ? '...' : u.hoat_dong ? 'Khóa' : 'Mở khóa'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="text-center text-gray-400 py-8">Không tìm thấy người dùng.</p>
          )}
        </div>
      )}
    </div>
  );
}

function TabAnalyses() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/analyses?limit=100')
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const scoreColor = (val) => {
    if (!val) return 'text-gray-400';
    if (val >= 80) return 'text-green-600';
    if (val >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-2xl border border-black/10 overflow-hidden shadow-sm">
      {loading ? (
        <p className="text-gray-500 text-sm p-6">Đang tải...</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-black/10">
            <tr>
              {['Người dùng', 'CV', 'JD', 'Điểm', 'Trạng thái', 'Thời gian'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-gray-600 font-semibold text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={r.result_id} className={`border-b border-black/5 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{r.ten_nguoi_dung}</p>
                  <p className="text-xs text-gray-400">{r.email_nguoi_dung}</p>
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate" title={r.ten_cv}>{r.ten_cv}</td>
                <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate" title={r.ten_jd}>{r.ten_jd}</td>
                <td className={`px-4 py-3 font-bold text-lg ${scoreColor(r.diem_tong)}`}>
                  {r.diem_tong ? r.diem_tong.toFixed(2) : '--'}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    r.trang_thai === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    r.trang_thai === 'PROCESSING' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {r.trang_thai === 'COMPLETED' ? 'Hoàn tất' : r.trang_thai === 'PROCESSING' ? 'Đang xử lý' : 'Thất bại'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(r.created_at).toLocaleString('vi-VN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && data.length === 0 && (
        <p className="text-center text-gray-400 py-8">Chưa có lịch sử phân tích.</p>
      )}
    </div>
  );
}

function TabChats() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get('/admin/chats?limit=100')
      .then((r) => setSessions(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-gray-500 text-sm">Đang tải...</p>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/10 p-8 text-center text-gray-400">
          Chưa có lịch sử chat nào được lưu.
        </div>
      ) : (
        sessions.map((s) => (
          <div key={s.session_id} className="bg-white rounded-2xl border border-black/10 shadow-sm overflow-hidden">
            <div
              className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpanded(expanded === s.session_id ? null : s.session_id)}
            >
              <div>
                <p className="font-semibold text-gray-900">{s.ten_nguoi_dung}</p>
                <p className="text-xs text-gray-400">{s.email} • {s.so_tin_nhan} tin nhắn • {new Date(s.created_at).toLocaleString('vi-VN')}</p>
                {s.tin_nhan_cuoi && (
                  <p className="text-sm text-gray-500 mt-1 italic">"{s.tin_nhan_cuoi}..."</p>
                )}
              </div>
              <span className="text-gray-400 text-lg">{expanded === s.session_id ? '▲' : '▼'}</span>
            </div>

            {expanded === s.session_id && s.messages && (
              <div className="border-t border-black/5 px-5 py-4 bg-gray-50 space-y-2 max-h-80 overflow-y-auto modern-scrollbar">
                {s.messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-black/10 text-gray-800'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'users', label: 'Người dùng' },
  { key: 'analyses', label: 'Lịch sử phân tích' },
  { key: 'chats', label: 'Lịch sử Chat AI' },
];

export default function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (!loading && (!user || user.vai_tro !== 'ADMIN')) {
      navigate('/cvs', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Quản trị hệ thống</h1>
          <p className="text-gray-500 mt-1">Xin chào, {user.ho_ten} - Bảng điều khiển Admin</p>
        </div>
        <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
          ADMIN
        </span>
      </div>

      <div className="flex gap-2 border-b border-black/10 pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-xl transition-colors ${
              activeTab === tab.key
                ? 'bg-white border border-b-white border-black/10 text-blue-600 -mb-px'
                : 'text-gray-500 hover:text-gray-800 hover:bg-black/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'dashboard' && <TabDashboard />}
        {activeTab === 'users' && <TabUsers />}
        {activeTab === 'analyses' && <TabAnalyses />}
        {activeTab === 'chats' && <TabChats />}
      </div>
    </div>
  );
}
