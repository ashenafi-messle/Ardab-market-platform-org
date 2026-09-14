'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/context/AuthContext';
import { maintenanceApi } from '@/lib/api';
import {
  SystemService,
  MaintenanceWindow,
  MaintenanceTask,
  EquipmentServiceLog,
} from '@/types/maintenance';

type MaintenanceTab = 'SERVICES' | 'WINDOWS' | 'TASKS' | 'FLEET';

export default function MaintenanceManagementPage() {
  const { selectedCity } = useAuth();
  const [activeTab, setActiveTab] = useState<MaintenanceTab>('SERVICES');
  const [services, setServices] = useState<SystemService[]>([]);
  const [windows, setWindows] = useState<MaintenanceWindow[]>([]);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [equipmentLogs, setEquipmentLogs] = useState<EquipmentServiceLog[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // New Maintenance Window Modal
  const [showNewWindowModal, setShowNewWindowModal] = useState(false);
  const [winTitle, setWinTitle] = useState('');
  const [winDescription, setWinDescription] = useState('');
  const [winStart, setWinStart] = useState('');
  const [winEnd, setWinEnd] = useState('');
  const [winAnnounce, setWinAnnounce] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      maintenanceApi.getServices(),
      maintenanceApi.getMaintenanceWindows(),
      maintenanceApi.getTasks(),
      maintenanceApi.getEquipmentLogs(selectedCity),
    ]).then(([srvs, wins, tsks, logs]) => {
      if (isMounted) {
        setServices(srvs);
        setWindows(wins);
        setTasks(tsks);
        setEquipmentLogs(logs);
      }
    }).catch((err) => {
      console.error('Failed to load maintenance data:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedCity]);

  const handleRunTask = async (taskId: string) => {
    try {
      const updated = await maintenanceApi.runTask(taskId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      setActionMessage(`Maintenance task "${updated.name}" executed successfully.`);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateWindowStatus = async (winId: string, status: MaintenanceWindow['status']) => {
    try {
      const updated = await maintenanceApi.updateWindowStatus(winId, status);
      setWindows((prev) => prev.map((w) => (w.id === winId ? updated : w)));
      setActionMessage(`Maintenance window status updated to ${status}.`);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateWindow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!winTitle.trim() || !winStart.trim()) return;

    try {
      const newWin = await maintenanceApi.createWindow({
        title: winTitle,
        description: winDescription,
        scheduledStartTime: winStart,
        scheduledEndTime: winEnd || 'Open window',
        status: 'SCHEDULED',
        affectedServices: ['PostgreSQL Database Cluster', 'PostGIS Spatial Engine'],
        announcedToUsers: winAnnounce,
        createdBy: 'Eden Tilahun (Sub Admin)',
      });
      setWindows((prev) => [newWin, ...prev]);
      setShowNewWindowModal(false);
      setWinTitle('');
      setWinDescription('');
      setWinStart('');
      setWinEnd('');
      setActionMessage(`Scheduled maintenance window "${newWin.title}" created.`);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const healthyServices = services.filter((s) => s.status === 'HEALTHY').length;

  return (
    <AdminLayout>
      <PageContainer
        title="Maintenance &amp; System Health Management"
        subtitle="Monitor system services, plan maintenance windows, execute database optimization tasks, and review fleet servicing"
        breadcrumbs={[{ label: 'Sub Admin' }, { label: 'Maintenance Management' }]}
        actions={
          <button
            type="button"
            className="btn btn-sm btn-ardab-primary d-flex align-items-center gap-1 shadow-sm"
            onClick={() => setShowNewWindowModal(true)}
          >
            <i className="bi bi-calendar-plus"></i>
            <span>Schedule Maintenance Window</span>
          </button>
        }
      >
        {/* Flash Message */}
        {actionMessage && (
          <div className="alert alert-success alert-dismissible fade show d-flex align-items-center justify-content-between p-3 mb-4 rounded-3 shadow-sm border-0" role="alert">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-check-circle-fill text-success fs-5"></i>
              <span className="fw-medium">{actionMessage}</span>
            </div>
            <button type="button" className="btn-close" onClick={() => setActionMessage(null)}></button>
          </div>
        )}

        {/* Maintenance Overview KPIs */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100">
              <span className="text-muted small d-block mb-1">Services Health</span>
              <div className="fs-3 fw-bold text-success">{healthyServices}/{services.length}</div>
              <span className="badge badge-success-soft mt-1">100% Operational</span>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100">
              <span className="text-muted small d-block mb-1">Scheduled Windows</span>
              <div className="fs-3 fw-bold text-dark">{windows.filter((w) => w.status === 'SCHEDULED').length}</div>
              <span className="badge badge-info-soft mt-1">Next: Sunday 02:00 AM</span>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100">
              <span className="text-muted small d-block mb-1">System Tasks</span>
              <div className="fs-3 fw-bold text-primary">{tasks.length}</div>
              <span className="text-muted small">Auto-Optimization Active</span>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="ardab-card p-3 p-md-4 h-100">
              <span className="text-muted small d-block mb-1">Fleet Workshop Logs</span>
              <div className="fs-3 fw-bold text-dark">{equipmentLogs.length}</div>
              <span className="text-muted small">5,000 KG Fleet Servicing</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 overflow-x-auto pb-1">
          <div className="d-flex gap-2" style={{ minWidth: 'max-content' }}>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 ${activeTab === 'SERVICES' ? 'btn-ardab-primary shadow-sm' : 'btn-outline-secondary bg-white border'}`}
              onClick={() => setActiveTab('SERVICES')}
            >
              <i className="bi bi-cpu me-1"></i> Core Services ({services.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 ${activeTab === 'WINDOWS' ? 'btn-ardab-primary shadow-sm' : 'btn-outline-secondary bg-white border'}`}
              onClick={() => setActiveTab('WINDOWS')}
            >
              <i className="bi bi-calendar-range me-1"></i> Maintenance Windows ({windows.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 ${activeTab === 'TASKS' ? 'btn-ardab-primary shadow-sm' : 'btn-outline-secondary bg-white border'}`}
              onClick={() => setActiveTab('TASKS')}
            >
              <i className="bi bi-gear-wide-connected me-1"></i> Optimization Tasks ({tasks.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 ${activeTab === 'FLEET' ? 'btn-ardab-primary shadow-sm' : 'btn-outline-secondary bg-white border'}`}
              onClick={() => setActiveTab('FLEET')}
            >
              <i className="bi bi-truck me-1"></i> Fleet Equipment Servicing ({equipmentLogs.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Core Services */}
        {activeTab === 'SERVICES' && (
          <div className="row g-3 mb-4">
            {services.map((srv) => (
              <div key={srv.id} className="col-12 col-md-6 col-xl-4">
                <div className="ardab-card p-4 h-100 shadow-sm border">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="badge badge-neutral-soft" style={{ fontSize: '0.7rem' }}>
                      {srv.category}
                    </span>
                    <span className="badge badge-success-soft d-flex align-items-center gap-1">
                      <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '0.65rem' }}></i>
                      {srv.status}
                    </span>
                  </div>

                  <h6 className="fw-bold text-dark mb-1">{srv.name}</h6>
                  <span className="text-muted small d-block mb-3" style={{ fontSize: '0.72rem' }}>
                    Node: <code>{srv.serverNode}</code>
                  </span>

                  <div className="row g-2 p-3 bg-light rounded-3 border mb-3 text-center">
                    <div className="col-6 border-end">
                      <span className="text-muted small d-block" style={{ fontSize: '0.7rem' }}>Latency</span>
                      <strong className="text-dark fs-6">{srv.latencyMs} ms</strong>
                    </div>
                    <div className="col-6">
                      <span className="text-muted small d-block" style={{ fontSize: '0.7rem' }}>Uptime</span>
                      <strong className="text-success fs-6">{srv.uptimePercentage}%</strong>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between text-muted small" style={{ fontSize: '0.72rem' }}>
                    <span>Last Telemetry Sync:</span>
                    <span>{srv.lastChecked}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Maintenance Windows */}
        {activeTab === 'WINDOWS' && (
          <div className="d-flex flex-column gap-3 mb-4">
            {windows.map((win) => (
              <div key={win.id} className="ardab-card p-4 border shadow-sm">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <span className="badge badge-info-soft mb-1">{win.id}</span>
                    <h5 className="fw-bold text-dark mb-0">{win.title}</h5>
                  </div>
                  <span
                    className={`badge ${
                      win.status === 'COMPLETED'
                        ? 'badge-success-soft'
                        : win.status === 'IN_PROGRESS'
                        ? 'badge-warning-soft'
                        : 'badge-info-soft'
                    }`}
                  >
                    {win.status}
                  </span>
                </div>

                <p className="text-muted small mb-3">{win.description}</p>

                <div className="row g-3 p-3 bg-light rounded-3 border mb-3">
                  <div className="col-12 col-md-6">
                    <span className="text-muted small d-block">Scheduled Window:</span>
                    <strong className="text-dark small">
                      <i className="bi bi-clock me-1 text-primary"></i> {win.scheduledStartTime} &mdash; {win.scheduledEndTime}
                    </strong>
                  </div>
                  <div className="col-12 col-md-6">
                    <span className="text-muted small d-block">Affected Services:</span>
                    <div className="d-flex gap-1 flex-wrap mt-1">
                      {win.affectedServices.map((s) => (
                        <span key={s} className="badge bg-white text-dark border" style={{ fontSize: '0.7rem' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                  <span className="text-muted small">
                    Created by: <strong className="text-dark">{win.createdBy}</strong>
                    {win.announcedToUsers && <span className="ms-2 badge bg-success-subtle text-success">User Notice Broadcasted</span>}
                  </span>
                  <div className="d-flex gap-2">
                    {win.status === 'SCHEDULED' && (
                      <button
                        type="button"
                        className="btn btn-sm btn-warning fw-semibold"
                        onClick={() => handleUpdateWindowStatus(win.id, 'IN_PROGRESS')}
                      >
                        Start Maintenance
                      </button>
                    )}
                    {win.status === 'IN_PROGRESS' && (
                      <button
                        type="button"
                        className="btn btn-sm btn-success fw-semibold"
                        onClick={() => handleUpdateWindowStatus(win.id, 'COMPLETED')}
                      >
                        Complete Window
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Automated Optimization Tasks */}
        {activeTab === 'TASKS' && (
          <div className="ardab-card p-0 mb-4 overflow-hidden shadow-sm">
            <div className="ardab-table-wrapper">
              <table className="ardab-table">
                <thead>
                  <tr>
                    <th>Task Name</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Schedule Frequency</th>
                    <th>Last Duration</th>
                    <th>Status</th>
                    <th className="text-end">Manual Trigger</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <div className="fw-semibold text-dark">{task.name}</div>
                        <div className="text-muted small" style={{ fontSize: '0.7rem' }}>
                          Last executed: {task.lastRun}
                        </div>
                      </td>
                      <td><span className="badge badge-neutral-soft">{task.category}</span></td>
                      <td className="small text-muted" style={{ maxWidth: 260 }}>{task.description}</td>
                      <td className="small text-dark">{task.frequency}</td>
                      <td className="small fw-medium text-dark">{task.lastDurationMs} ms</td>
                      <td>
                        <span className={`badge ${task.status === 'SUCCESS' ? 'badge-success-soft' : 'badge-danger-soft'}`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-light border"
                          onClick={() => handleRunTask(task.id)}
                        >
                          <i className="bi bi-play-fill me-1 text-success"></i> Run Now
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Fleet Equipment Servicing */}
        {activeTab === 'FLEET' && (
          <div className="ardab-card p-0 mb-4 overflow-hidden shadow-sm">
            <div className="ardab-table-wrapper">
              <table className="ardab-table">
                <thead>
                  <tr>
                    <th>Vehicle &amp; Reg</th>
                    <th>City &amp; Workshop</th>
                    <th>Service Type</th>
                    <th>Estimated Cost</th>
                    <th>Scheduled Date</th>
                    <th>Status</th>
                    <th>Technician Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {equipmentLogs.map((eq) => (
                    <tr key={eq.id}>
                      <td>
                        <div className="fw-bold text-dark">{eq.vehicleId}</div>
                        <div className="text-muted small" style={{ fontSize: '0.7rem' }}>{eq.vehicleReg} (5,000 KG)</div>
                      </td>
                      <td>
                        <div className="fw-medium text-dark small">{eq.city}</div>
                        <div className="text-muted small" style={{ fontSize: '0.72rem' }}>{eq.workshopLocation}</div>
                      </td>
                      <td className="small text-dark">{eq.serviceType}</td>
                      <td className="fw-bold text-dark">{eq.costEtb.toLocaleString()} ETB</td>
                      <td className="small text-muted">{eq.scheduledDate}</td>
                      <td>
                        <span className={`badge ${eq.status === 'COMPLETED' ? 'badge-success-soft' : 'badge-warning-soft'}`}>
                          {eq.status}
                        </span>
                      </td>
                      <td className="small text-muted">{eq.technicianNotes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Schedule Maintenance Window Modal */}
        {showNewWindowModal && (
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fw-bold text-dark">Schedule Maintenance Window</h5>
                  <button type="button" className="btn-close" onClick={() => setShowNewWindowModal(false)}></button>
                </div>
                <form onSubmit={handleCreateWindow}>
                  <div className="modal-body p-4">
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-dark mb-1">Window Title</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Spatial Database Indexing & Polygon Optimization"
                        value={winTitle}
                        onChange={(e) => setWinTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-dark mb-1">Description</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder="Describe services impacted and operational reason..."
                        value={winDescription}
                        onChange={(e) => setWinDescription(e.target.value)}
                      ></textarea>
                    </div>
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="form-label small fw-semibold text-dark mb-1">Start Time</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Sunday, 02:00 AM"
                          value={winStart}
                          onChange={(e) => setWinStart(e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-semibold text-dark mb-1">End Time</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Sunday, 03:30 AM"
                          value={winEnd}
                          onChange={(e) => setWinEnd(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="winAnnounce"
                        checked={winAnnounce}
                        onChange={(e) => setWinAnnounce(e.target.checked)}
                      />
                      <label className="form-check-label small text-muted" htmlFor="winAnnounce">
                        Broadcast maintenance banner to active platform users
                      </label>
                    </div>
                  </div>
                  <div className="modal-footer border-top bg-light">
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowNewWindowModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-sm btn-ardab-primary">
                      Create Window
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </AdminLayout>
  );
}
