import React, { useState, useEffect } from "react";
import { 
  AlertCircle, 
  Map as MapIcon, 
  BarChart3, 
  Users, 
  Search, 
  Bell, 
  ShieldAlert,
  Clock,
  MapPin,
  CheckCircle2,
  Send,
  Loader2,
  Menu,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";
import { Map as PigeonMap, Marker, ZoomControl } from "pigeon-maps";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { analyzeFieldReport } from "./services/geminiService";
import { 
  Report, 
  subscribeToReports, 
  createReport, 
  assignVolunteer,
  Volunteer,
  subscribeToVolunteers,
  updateVolunteerLocation,
  seedVolunteers 
} from "./services/firebaseService";

// --- Components ---

const ResourceStats = ({ reports, volunteers }: { reports: Report[], volunteers: Volunteer[] }) => {
  // 1. Category Data
  const categories = reports.reduce((acc: any, report) => {
    acc[report.category] = (acc[report.category] || 0) + 1;
    return acc;
  }, {});

  const categoryData = Object.keys(categories).map(key => ({
    name: key,
    value: categories[key]
  }));

  // 2. Priority Data
  const priorityLevels = [0, 0, 0]; // Low (1-4), Med (5-7), High (8-10)
  reports.forEach(r => {
    if (r.priorityScore >= 8) priorityLevels[2]++;
    else if (r.priorityScore >= 5) priorityLevels[1]++;
    else priorityLevels[0]++;
  });

  const priorityData = [
    { name: 'Low', count: priorityLevels[0], fill: '#10B981' },
    { name: 'Medium', count: priorityLevels[1], fill: '#F59E0B' },
    { name: 'High', count: priorityLevels[2], fill: '#EF4444' },
  ];

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const availableVolunteers = volunteers.filter(v => v.isAvailable).length;

  const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#06B6D4'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Impact</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{reports.length}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Field Reports</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-blue-600">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Response Force</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-blue-600">{volunteers.length}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Active Units</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Awaiting Dispatch</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-500">{pendingCount}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Unassigned</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unit Availability</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-500">{volunteers.length > 0 ? Math.round((availableVolunteers / volunteers.length) * 100) : 0}%</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Ready Rate</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Breakdown */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-600 rounded-full" />
            Category Distribution
          </h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: '#0F172A', 
                    border: 'none', 
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Histogram */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-2">
            <div className="w-1 h-4 bg-red-600 rounded-full" />
            Crisis Priority Density
          </h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 'bold' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 'bold' }}
                />
                <RechartsTooltip 
                  cursor={{ fill: '#F1F5F9' }}
                  contentStyle={{ 
                    backgroundColor: '#0F172A', 
                    border: 'none', 
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const VolunteerMapViewer = ({ reports, volunteers }: { reports: Report[], volunteers: Volunteer[] }) => {
  const [center, setCenter] = useState<[number, number]>([0, 0]);
  const [zoom, setZoom] = useState(12);
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCenter([pos.coords.latitude, pos.coords.longitude]);
      });
    }
  }, []);

  const simulateMovement = async () => {
    if (volunteers.length === 0) return;
    setIsSimulating(true);
    
    // Pick first volunteer and shift them slightly
    const vol = volunteers[0];
    const newCoords = {
      latitude: vol.location.latitude + (Math.random() - 0.5) * 0.005,
      longitude: vol.location.longitude + (Math.random() - 0.5) * 0.005
    };
    
    try {
      await updateVolunteerLocation(vol.id, newCoords);
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="h-[calc(100vh-280px)] w-full bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm relative text-slate-900 font-sans">
      {/* Top Left Legend */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-sm leading-none">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Live Fleet Stats</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/20" />
              <span className="text-[10px] font-bold text-slate-600 uppercase">Emergency Site</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-600 shadow-sm shadow-blue-600/20" />
              <span className="text-[10px] font-bold text-slate-600 uppercase">Agent (Realtime)</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white/90 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-sm pointer-events-auto">
          <button 
            onClick={simulateMovement}
            disabled={isSimulating || volunteers.length === 0}
            className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 disabled:opacity-50"
          >
            <Clock className={cn("w-3 h-3", isSimulating && "animate-spin")} />
            Simulate Pulse/Move
          </button>
        </div>
      </div>

      {/* Volunteer Details Tooltip Overlay */}
      <AnimatePresence>
        {selectedVolunteer && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-4 right-4 z-20 w-64 bg-[#0F172A] text-white p-5 rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <button 
                onClick={() => setSelectedVolunteer(null)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-1 mb-4">
              <h4 className="font-black text-xs uppercase tracking-widest text-slate-400">Agent Identifier</h4>
              <p className="font-bold text-sm tracking-tight">{selectedVolunteer.name}</p>
              <p className="text-[10px] font-mono text-slate-500 lowercase">unit_id: {selectedVolunteer.id.slice(0, 8)}</p>
            </div>

            <div className="space-y-2">
              <h4 className="font-black text-xs uppercase tracking-widest text-slate-400">Verified Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedVolunteer.skills.map((skill, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-[9px] font-black uppercase rounded tracking-wider border border-blue-500/10">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                GPS Signal Transmitting
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PigeonMap 
        center={center} 
        zoom={zoom} 
        onBoundsChanged={({ center, zoom }) => {
          setCenter(center)
          setZoom(zoom)
        }}
        onClick={() => setSelectedVolunteer(null)}
      >
        <ZoomControl />
        
        {/* Reports Markers */}
        {reports.map((report) => (
          <React.Fragment key={report.id}>
            <Marker 
              anchor={[report.location.latitude, report.location.longitude]} 
              color="#EF4444"
              onClick={() => console.log('Report selected:', report.id)}
            />
          </React.Fragment>
        ))}

        {/* Volunteers Markers */}
        {volunteers.map((volunteer) => (
          <React.Fragment key={volunteer.id}>
            <Marker 
              anchor={[volunteer.location.latitude, volunteer.location.longitude]} 
              color="#2563EB"
              onClick={() => setSelectedVolunteer(volunteer)}
            />
          </React.Fragment>
        ))}
      </PigeonMap>

      {reports.length === 0 && volunteers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 backdrop-blur-sm z-50 pointer-events-none">
          <div className="text-center">
            <MapIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No Geo-Data Available</p>
            <p className="text-[10px] text-slate-400 mt-1">Awaiting field reports or volunteer check-ins...</p>
          </div>
        </div>
      )}
    </div>
  );
};
// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
      active 
        ? "bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-sm" 
        : "text-slate-400 hover:bg-white/5 hover:text-white"
    )}
  >
    <Icon className={cn("w-5 h-5", active ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
    <span className="font-medium">{label}</span>
  </button>
);

const CrisisCard = ({ report, volunteers }: { report: Report; volunteers: Volunteer[]; key?: any }) => {
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const getPriorityBorder = (score: number) => {
    if (score >= 8) return "border-l-red-500";
    if (score >= 5) return "border-l-amber-500";
    return "border-l-emerald-500";
  };

  const getBadgeStyles = (score: number) => {
    if (score >= 8) return "bg-red-50 text-red-600";
    if (score >= 5) return "bg-amber-50 text-amber-600";
    return "bg-emerald-50 text-emerald-600";
  };

  const handleAssign = async () => {
    if (!selectedVolunteerId) return;
    setIsUpdating(true);
    try {
      const volunteer = volunteers.find(v => v.id === selectedVolunteerId);
      if (volunteer) {
        await assignVolunteer(report.id, volunteer.id, volunteer.name);
        setIsAssigning(false);
      }
    } catch (error) {
      console.error("Assignment failed:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const availableVolunteers = volunteers.filter(v => v.isAvailable);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white rounded-2xl shadow-sm border-l-8 overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-md",
        getPriorityBorder(report.priorityScore)
      )}
    >
      <div className="p-5 flex-1 relative">
        {report.status === 'assigned' && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
            <CheckCircle2 className="w-3 h-3" /> Assigned
          </div>
        )}

        <div className="flex justify-between items-start mb-3">
          <span className={cn("px-2 py-1 text-[10px] font-black rounded uppercase tracking-wider", getBadgeStyles(report.priorityScore))}>
            Priority {report.priorityScore}
          </span>
          <span className="text-xs text-slate-400 font-mono tracking-tight group-hover:text-slate-500 transition-colors">
            #{report.id.slice(0, 6).toUpperCase()}
          </span>
        </div>
        
        <h4 className="font-bold text-slate-800 text-sm mb-2 uppercase tracking-tight flex items-center gap-1.5">
          <div className={cn("w-1.5 h-1.5 rounded-full", report.priorityScore >= 8 ? "bg-red-500" : report.priorityScore >= 5 ? "bg-amber-500" : "bg-emerald-500")} />
          Category: {report.category}
        </h4>
        
        <p className="text-sm text-slate-600 leading-relaxed mb-4 font-medium">
          {report.summary}
        </p>
        
        <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2 italic">
          {report.rawText}
        </p>

        {report.status === 'assigned' && (
          <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Agent</p>
              <p className="text-xs font-bold text-slate-700">{report.assignedVolunteerName}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {report.keywords.map((kw, i) => (
            <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase tracking-tight">
              #{kw}
            </span>
          ))}
        </div>
      </div>

      {isAssigning ? (
        <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-3">
          <select 
            value={selectedVolunteerId}
            onChange={(e) => setSelectedVolunteerId(e.target.value)}
            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="">Select available unit...</option>
            {availableVolunteers.map(v => (
              <option key={v.id} value={v.id}>{v.name} (Unit {v.id.slice(0,4)})</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsAssigning(false)}
              className="flex-1 py-2 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
            <button 
              onClick={handleAssign}
              disabled={!selectedVolunteerId || isUpdating}
              className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest disabled:bg-slate-200"
            >
              {isUpdating ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Confirm"}
            </button>
          </div>
        </div>
      ) : (
        <button 
          className="w-full bg-slate-50 hover:bg-slate-100 py-3 text-xs font-bold text-slate-500 hover:text-slate-700 border-t border-slate-100 uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
          onClick={() => setIsAssigning(true)}
        >
          <Users className="w-3.5 h-3.5" />
          {report.status === 'assigned' ? 'Reassign Unit' : 'Manually Assign'}
        </button>
      )}
    </motion.div>
  );
};

import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider,
  User,
  signOut
} from "firebase/auth";
import { auth } from "./lib/firebase";

// --- Components ---

const LoginScreen = ({ onGuestLogin }: { onGuestLogin: () => void }) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
      // Optional: Inform user about authorized domains
      alert("Login failed. If you're on a new domain (like Vercel), ensure it's added to 'Authorized Domains' in your Firebase Console.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0F172A] p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-3xl p-10 shadow-2xl overflow-hidden relative"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600" />
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-lg rotate-3">
            <ShieldAlert className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase">Command Access</h1>
          <p className="text-slate-500 font-medium text-sm mb-8">NGO Disaster Relief Orchestrator</p>
          
          <div className="w-full space-y-3">
            <button 
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 bg-[#0F172A] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-xl disabled:bg-slate-200"
            >
              {isLoggingIn ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 bg-white p-1 rounded-full" alt="Google" />
              )}
              Sign in with Google
            </button>

            <button 
              onClick={onGuestLogin}
              className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-slate-600 transition-colors"
            >
              Enter in Demo Mode
            </button>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-100 flex gap-4 opacity-50">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <CheckCircle2 className="w-3 h-3" /> Encrypted
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <ShieldAlert className="w-3 h-3" /> Secure AI
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState("Active Emergencies");
  const [reports, setReports] = useState<Report[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [newReport, setNewReport] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const handleGuestLogin = () => {
    setUser({
      displayName: "Demo Commander",
      email: "demo@orchestrator.ai",
      photoURL: null,
      isGuest: true
    });
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedVolunteers();
    } catch (err) {
      console.error("Seeding failed:", err);
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        // Automatically enter Demo Mode if no user is found
        handleGuestLogin();
      }
      setIsInitialLoading(false);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setReports([]);
      setVolunteers([]);
      return;
    }
    const unsubReports = subscribeToReports(setReports);
    const unsubVolunteers = subscribeToVolunteers(setVolunteers);
    return () => {
      unsubReports();
      unsubVolunteers();
    };
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReport.trim()) return;

    setIsSubmitting(true);
    try {
      // 1. Analyze with Gemini
      const analysis = await analyzeFieldReport(newReport);
      
      // 2. Geolocation (Simulated for this demo, or real if permitted)
      let coords = { latitude: 0, longitude: 0 };
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => 
          navigator.geolocation.getCurrentPosition(res, rej)
        );
        coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch (err) {
        console.warn("Geolocation failed, using default coords");
      }

      // 3. Simple Priority Score logic
      const priorityScore = Math.min(10, analysis.urgency_score + (newReport.length > 100 ? 1 : 0));

      // 4. Save to Firestore
      await createReport({
        rawText: newReport,
        category: analysis.category,
        urgencyScore: analysis.urgency_score,
        priorityScore,
        summary: analysis.summary,
        keywords: analysis.keywords,
        location: coords,
        status: "pending"
      });

      // 5. Simulate backend orchestrator processing
      await fetch("/api/reports/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analyzedData: analysis, location: coords })
      });

      setNewReport("");
    } catch (error) {
      console.error("Submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F1F5F9]">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  // Gate removed - app starts in Guest/Demo mode automatically

  return (
    <div className="flex h-screen bg-[#F1F5F9] font-sans text-slate-900 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden absolute top-4 left-4 z-50 p-2 bg-[#0F172A] text-white rounded-lg shadow-md"
        >
          <Menu className="w-6 h-6" />
        </button>
      )}

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="h-full bg-[#0F172A] text-slate-300 flex flex-col relative z-40 overflow-hidden shrink-0"
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white">LA</div>
          <h1 className="text-lg font-bold text-white tracking-tight">LOGIC ARCHITECT</h1>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden ml-auto">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 px-4 space-y-1">
          <SidebarItem 
            icon={AlertCircle} 
            label="Active Emergencies" 
            active={activeTab === "Active Emergencies"} 
            onClick={() => setActiveTab("Active Emergencies")}
          />
          <SidebarItem 
            icon={MapIcon} 
            label="Volunteer Map" 
            active={activeTab === "Volunteer Map"} 
            onClick={() => setActiveTab("Volunteer Map")}
          />
          <SidebarItem 
            icon={BarChart3} 
            label="Resource Stats" 
            active={activeTab === "Resource Stats"} 
            onClick={() => setActiveTab("Resource Stats")}
          />
        </div>

        <div className="p-6 mt-auto space-y-4">
          <button 
            onClick={handleSeed}
            disabled={isSeeding}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 disabled:bg-slate-700"
          >
            {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            Register Demo Units
          </button>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">System Status</p>
            <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Orchestrator Online
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full bg-[#F8FAFC]">
        {/* Header */}
        <header className="h-20 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Crisis Command Center</h2>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Real-time intelligence from Google Gemini API</p>
          </div>
          <div className="flex gap-6 items-center">
            {user?.isGuest && (
              <button 
                onClick={() => {
                  const provider = new GoogleAuthProvider();
                  signInWithPopup(auth, provider).catch(err => {
                    alert(`Login Error: ${err.code}. Check Firebase Authorized Domains.`);
                  });
                }}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-blue-100 transition-colors"
              >
                <ShieldAlert className="w-3 h-3" /> Connect Google
              </button>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                {user?.displayName || 'Active Agent'} 
                {user?.isGuest && <span className="text-amber-500 ml-1">(Demo)</span>}
              </p>
              <button 
                onClick={handleLogout}
                className="text-[10px] text-blue-600 uppercase font-black tracking-widest hover:underline"
              >
                {user?.isGuest ? "Reset App" : "Logout"}
              </button>
            </div>
            <div className="w-px h-10 bg-slate-100 hidden sm:block"></div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Active Reports</p>
              <p className="text-xl font-mono font-bold text-slate-900">{reports.length}</p>
            </div>
            <div className="w-px h-10 bg-slate-100"></div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Efficiency</p>
              <p className="text-xl font-mono font-bold text-blue-600">98.4%</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Users className="w-4 h-4" />
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Crisis Feed: Incoming Reports</h3>
              <div className="flex gap-3 items-center">
                <div className="h-1 w-12 bg-blue-600 rounded-full" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Orchestration in progress</span>
              </div>
            </div>

            {/* Quick Submit Form (Crisis Input) - Stylized */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-slate-900" />
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="w-4 h-4 text-slate-900" />
                <h2 className="font-black text-xs uppercase tracking-widest text-slate-900">New Crisis Entry</h2>
              </div>
              <form onSubmit={handleReportSubmit} className="flex gap-4">
                <div className="flex-1 relative">
                  <textarea 
                    value={newReport}
                    onChange={(e) => setNewReport(e.target.value)}
                    placeholder="Describe the emergency situation for AI orchestration..."
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all resize-none h-20 font-medium"
                  />
                  {isSubmitting && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center flex-col gap-2 z-10">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 animate-pulse">Running Gemini analysis...</span>
                    </div>
                  )}
                </div>
                <button 
                  type="submit"
                  disabled={isSubmitting || !newReport.trim()}
                  className="bg-[#0F172A] text-white px-8 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 disabled:bg-slate-200 transition-all active:scale-95 shadow-lg shadow-slate-900/10 flex flex-col items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  SUBMIT
                </button>
              </form>
            </div>

            {/* Feed Section */}
            {activeTab === "Active Emergencies" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {reports.length === 0 ? (
                    <div className="col-span-full py-24 flex flex-col items-center justify-center bg-white border border-slate-200 border-dashed rounded-3xl">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Bell className="w-8 h-8 text-slate-200" />
                      </div>
                      <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Command Center Idle</p>
                      <p className="text-[11px] text-slate-400 mt-1">Awaiting incoming field reports...</p>
                    </div>
                  ) : (
                    reports.map(report => (
                      <CrisisCard key={report.id} report={report} volunteers={volunteers} />
                    ))
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Map Section */}
            {activeTab === "Volunteer Map" && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Geospatial Intelligence</h3>
                    <p className="text-xs text-slate-500 font-medium">Live report locations vs available volunteer units</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200 flex gap-4 shadow-sm">
                    <div className="flex items-center gap-2 px-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase">Emergency</span>
                       <span className="text-sm font-bold text-slate-900">{reports.length}</span>
                    </div>
                    <div className="w-px h-4 bg-slate-100 self-center" />
                    <div className="flex items-center gap-2 px-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase">Units</span>
                       <span className="text-sm font-bold text-blue-600">{volunteers.length}</span>
                    </div>
                  </div>
                </div>
                <VolunteerMapViewer reports={reports} volunteers={volunteers} />
              </motion.div>
            )}

            {activeTab === "Resource Stats" && (
              <ResourceStats reports={reports} volunteers={volunteers} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
