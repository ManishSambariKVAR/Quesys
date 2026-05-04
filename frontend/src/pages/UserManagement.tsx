import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import './UserManagement.css';

interface User {
    id: number;
    name: string;
    userid: string;
    userdept: string;
    adminlevel: string;
}

interface Department {
    id: number;
    department: string;
}

export default function UserManagement() {
    const location = useLocation();
    const navigate = useNavigate();

    const queryParams = new URLSearchParams(location.search);
    const activeTab = queryParams.get('tab') || 'view';

    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Edit modal state
    const [editUser, setEditUser] = useState<User | null>(null);
    const [editName, setEditName] = useState('');
    const [editUserId, setEditUserId] = useState('');
    const [editDept, setEditDept] = useState('');
    const [editAdmin, setEditAdmin] = useState('');

    // Add form state
    const [addName, setAddName] = useState('');
    const [addUserId, setAddUserId] = useState('');
    const [addPassword, setAddPassword] = useState('');
    const [addConfirm, setAddConfirm] = useState('');
    const [addDept, setAddDept] = useState('');
    const [addAdmin, setAddAdmin] = useState('');

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get<{ users: User[]; departments: Department[] }>('/admin/users');
            setUsers(res.data.users);
            setDepartments(res.data.departments);
        } catch {
            setMessage({ text: 'Failed to load users', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const showMsg = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 4000);
    };

    // ─── ADD USER ───
    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (addPassword !== addConfirm) {
            showMsg('Passwords do not match', 'error');
            return;
        }
        try {
            await api.post('/admin/users/register', {
                name: addName, userId: addUserId, password: addPassword,
                confirmPassword: addConfirm, userDept: addDept, adminlevel: addAdmin,
            });
            showMsg('User registered successfully', 'success');
            setAddName(''); setAddUserId(''); setAddPassword(''); setAddConfirm(''); setAddDept(''); setAddAdmin('');
            fetchUsers();
            navigate('/admin/users?tab=view');
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { error?: string } } };
            showMsg(axiosErr.response?.data?.error || 'Registration failed', 'error');
        }
    };

    // ─── EDIT USER ───
    const openEdit = (u: User) => {
        setEditUser(u);
        setEditName(u.name);
        setEditUserId(u.userid);
        setEditDept(u.userdept);
        setEditAdmin(u.adminlevel);
    };

    const handleEditUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editUser) return;
        try {
            await api.put('/admin/users/update', {
                userId: editUser.id, name: editName, userid: editUserId,
                userDept: editDept, adminLevel: editAdmin,
            });
            showMsg('User updated successfully', 'success');
            setEditUser(null);
            fetchUsers();
        } catch {
            showMsg('Update failed', 'error');
        }
    };

    // ─── DELETE USER ───
    const handleDeleteUser = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await api.delete(`/admin/users/${id}`);
            showMsg('User deleted', 'success');
            fetchUsers();
        } catch {
            showMsg('Delete failed', 'error');
        }
    };

    if (loading) {
        return <div className="um-loading"><div className="spinner" /></div>;
    }

    return (
        <div className="um-page">
            {message && <div className={`um-alert um-alert-${message.type}`}>{message.text}</div>}

            {/* ─── VIEW & EDIT TAB ─── */}
            {activeTab === 'view' && (
                <div className="um-content">
                    <h3 className="um-page-title">View & Edit User</h3>
                    <div className="um-table-wrapper">
                        <table className="um-table">
                            <thead>
                                <tr>
                                    <th>Sr No.</th>
                                    <th>Name</th>
                                    <th>User ID</th>
                                    <th>Department</th>
                                    <th>Administrative Level</th>
                                    <th style={{ width: '60px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u, i) => (
                                    <tr key={u.id}>
                                        <td>
                                            <div className="um-input-container">
                                                <input type="text" value={i + 1} readOnly />
                                            </div>
                                        </td>
                                        <td>
                                            <div className="um-input-container">
                                                <input type="text" value={u.name} readOnly />
                                            </div>
                                        </td>
                                        <td>
                                            <div className="um-input-container">
                                                <input type="text" value={u.userid} readOnly />
                                            </div>
                                        </td>
                                        <td>
                                            <div className="um-input-container">
                                                <input type="text" value={u.userdept} readOnly />
                                            </div>
                                        </td>
                                        <td>
                                            <div className="um-input-container">
                                                <input type="text" value={u.adminlevel} readOnly />
                                            </div>
                                        </td>
                                        <td>
                                            <button type="button" className="um-edit-button" onClick={() => openEdit(u)}>
                                                <i className="fa fa-edit"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ─── ADD TAB ─── */}
            {activeTab === 'add' && (
                <div className="um-content">
                    <h3 className="um-page-title">User Registration</h3>
                    <form className="um-add-form" onSubmit={handleAddUser}>
                        <div className="um-form-group">
                            <label className="um-label">Name:</label>
                            <input type="text" className="um-form-control" value={addName} onChange={e => setAddName(e.target.value)} placeholder="Vishal Padyal" required />
                        </div>
                        <div className="um-form-group">
                            <label className="um-label">User ID:</label>
                            <input type="text" className="um-form-control" value={addUserId} onChange={e => setAddUserId(e.target.value)} placeholder="admin" required />
                        </div>
                        <div className="um-form-group">
                            <label className="um-label">Administrative Level:</label>
                            <select className="um-form-control" value={addAdmin} onChange={e => setAddAdmin(e.target.value)} required>
                                <option value="" disabled>Please Select</option>
                                <option value="Admin">Admin</option>
                                <option value="Operator">Operator</option>
                            </select>
                        </div>
                        <div className="um-form-group">
                            <label className="um-label">Department:</label>
                            <select className="um-form-control" value={addDept} onChange={e => setAddDept(e.target.value)} required>
                                <option value="" disabled>Select Your Department</option>
                                {departments.map(d => <option key={d.id} value={d.department}>{d.department}</option>)}
                            </select>
                        </div>
                        <div className="um-form-group">
                            <label className="um-label">Password:</label>
                            <input type="password" className="um-form-control" value={addPassword} onChange={e => setAddPassword(e.target.value)} placeholder="Choose safe one" required />
                        </div>
                        <div className="um-form-group">
                            <label className="um-label">Confirm Password:</label>
                            <input type="password" className="um-form-control" value={addConfirm} onChange={e => setAddConfirm(e.target.value)} placeholder="Confirm Password" required />
                        </div>
                        <div className="um-submit-wrap">
                            <button type="submit" className="um-submit-btn">Sign Up</button>
                        </div>
                    </form>
                </div>
            )}

            {/* ─── DELETE TAB ─── */}
            {activeTab === 'delete' && (
                <div className="um-content">
                    <h3 className="um-page-title">Delete User</h3>
                    <div className="um-table-wrapper">
                        <table className="um-table">
                            <thead>
                                <tr>
                                    <th>Sr No.</th>
                                    <th>Name</th>
                                    <th>User ID</th>
                                    <th>Department</th>
                                    <th>Administrative Level</th>
                                    <th style={{ width: '60px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u, i) => (
                                    <tr key={u.id}>
                                        <td>
                                            <div className="um-input-container">
                                                <input type="text" value={i + 1} readOnly />
                                            </div>
                                        </td>
                                        <td>
                                            <div className="um-input-container">
                                                <input type="text" value={u.name} readOnly />
                                            </div>
                                        </td>
                                        <td>
                                            <div className="um-input-container">
                                                <input type="text" value={u.userid} readOnly />
                                            </div>
                                        </td>
                                        <td>
                                            <div className="um-input-container">
                                                <input type="text" value={u.userdept} readOnly />
                                            </div>
                                        </td>
                                        <td>
                                            <div className="um-input-container">
                                                <input type="text" value={u.adminlevel} readOnly />
                                            </div>
                                        </td>
                                        <td>
                                            <button type="button" className="um-delete-button" onClick={() => handleDeleteUser(u.id)}>
                                                <span style={{ fontSize: '20px' }}><i className="fa fa-trash"></i></span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ─── EDIT MODAL ─── */}
            {editUser && (
                <div className="um-modal">
                    <div className="um-modal-content">
                        <span className="um-close-button" onClick={() => setEditUser(null)}>&times;</span>
                        <h2>Edit User</h2>
                        <form onSubmit={handleEditUser} className="um-modal-form">
                            <div className="um-input-container modal-input" style={{ width: '150px' }}>
                                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name" required />
                            </div>
                            <div className="um-input-container modal-input" style={{ width: '150px' }}>
                                <input type="text" value={editUserId} onChange={e => setEditUserId(e.target.value)} placeholder="User ID" required />
                            </div>
                            <div className="um-input-container modal-input" style={{ width: '150px' }}>
                                <select value={editDept} onChange={e => setEditDept(e.target.value)} required>
                                    <option value="" disabled>Select Department</option>
                                    {departments.map(d => <option key={d.id} value={d.department}>{d.department}</option>)}
                                </select>
                            </div>
                            <div className="um-input-container modal-input" style={{ width: '150px' }}>
                                <select value={editAdmin} onChange={e => setEditAdmin(e.target.value)} required>
                                    <option value="">Select Level</option>
                                    <option value="Admin">Admin</option>
                                    <option value="Operator">Operator</option>
                                </select>
                            </div>
                            <button className="um-modal-submit" type="submit"><i className="fa fa-save"></i></button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}