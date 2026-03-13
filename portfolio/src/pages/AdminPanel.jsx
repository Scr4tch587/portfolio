import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import ProjectForm from '../components/admin/ProjectForm';
import ProjectList from '../components/admin/ProjectList';
import { useAdmin } from '../context/AdminContext';
import { db } from '../firebase';

function normalizeDocId(rawId) {
  const asNumber = Number.parseInt(rawId, 10);
  return Number.isNaN(asNumber) ? rawId : asNumber;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { logout } = useAdmin();
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selectedProject, setSelectedProject] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deletingProjectId, setDeletingProjectId] = useState(null);
  const formSectionRef = useRef(null);

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const snapshot = await getDocs(collection(db, 'projects'));
      const rows = snapshot.docs
        .map((projectDoc) => {
          const data = projectDoc.data();
          const normalizedId = normalizeDocId(projectDoc.id);
          return {
            docId: projectDoc.id,
            id: normalizedId,
            ...data,
          };
        })
        .sort((a, b) => (a.orderingPriority ?? 999) - (b.orderingPriority ?? 999));

      setProjects(rows);
    } catch (error) {
      setDeleteError(error?.message || 'Failed to refresh projects.');
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    setLoadingProjects(true);
    const unsubscribe = onSnapshot(
      collection(db, 'projects'),
      (snapshot) => {
        const rows = snapshot.docs
          .map((projectDoc) => {
            const data = projectDoc.data();
            const normalizedId = normalizeDocId(projectDoc.id);
            return {
              docId: projectDoc.id,
              id: normalizedId,
              ...data,
            };
          })
          .sort((a, b) => (a.orderingPriority ?? 999) - (b.orderingPriority ?? 999));
        setProjects(rows);
        setLoadingProjects(false);
      },
      (error) => {
        setDeleteError(error?.message || 'Failed to subscribe to projects.');
        setLoadingProjects(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const handleDeleteProject = async (project) => {
    const label = project?.title || project?.docId || 'this project';
    const confirmed = window.confirm(`Delete ${label}? This cannot be undone.`);
    if (!confirmed) return;

    setDeleteError('');
    setDeletingProjectId(project.docId);
    try {
      await deleteDoc(doc(db, 'projects', project.docId));
      if (selectedProject?.docId === project.docId) {
        setFormMode('create');
        setSelectedProject(null);
      }
      await fetchProjects();
    } catch (error) {
      setDeleteError(error?.message || 'Failed to delete project.');
    } finally {
      setDeletingProjectId(null);
    }
  };

  const tabClass = useMemo(
    () =>
      'rounded-full px-4 py-2 text-sm font-semibold transition-colors border border-white/10 data-[active=true]:bg-white data-[active=true]:text-black data-[active=false]:text-white data-[active=false]:hover:bg-white/10',
    [],
  );

  return (
    <main className="min-h-screen bg-[#090909] text-white px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/dev', { replace: true });
            }}
            className="rounded-md border border-white/25 px-3 py-2 text-xs font-semibold text-white"
          >
            Sign out
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-400">Manage Firestore-backed projects.</p>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            data-active
            className={tabClass}
            onClick={async () => {
              await fetchProjects();
            }}
          >
            Projects
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <div ref={formSectionRef}>
            <ProjectForm
              mode={formMode}
              project={selectedProject}
              onCancel={() => {
                setFormMode('create');
                setSelectedProject(null);
              }}
              onSaved={async () => {
                setFormMode('create');
                setSelectedProject(null);
                await fetchProjects();
              }}
            />
          </div>

          <ProjectList
            projects={projects}
            loading={loadingProjects}
            deletingProjectId={deletingProjectId}
            onRefresh={fetchProjects}
            onAdd={() => {
              setFormMode('create');
              setSelectedProject(null);
              formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            onEdit={(project) => {
              setFormMode('edit');
              setSelectedProject(project);
              setTimeout(() => {
                formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 0);
            }}
            onDelete={handleDeleteProject}
          />
          {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}
        </div>
      </div>
    </main>
  );
}
