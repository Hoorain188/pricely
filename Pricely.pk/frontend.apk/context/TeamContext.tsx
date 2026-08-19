import React, { createContext, useContext, useRef, useState, ReactNode } from 'react';
import { useActivityStore } from './ActivityContext';
import { useAccountsStore } from './AccountsContext';

export type TeamRole = 'admin' | 'support' | 'readonly';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  title: string;
  role: TeamRole;
}

export interface PendingRequest {
  id: string;
  name: string;
  email: string;
  requestedRole: TeamRole;
  requestedAt: string;
}

export interface RequestAccessResult {
  accepted: boolean;
  reason: 'accepted' | 'duplicate-pending' | 'duplicate-team' | 'account-exists';
}

interface TeamContextValue {
  team: TeamMember[];
  pendingRequests: PendingRequest[];
  // Self-service signup asking for back-office access — goes into the
  // pending queue and does NOT grant access until an existing admin approves it.
  requestAccess: (name: string, email: string, role: TeamRole, password?: string) => RequestAccessResult;
  approveRequest: (id: string) => void;
  rejectRequest: (id: string) => void;
  changeRole: (id: string, role: TeamRole) => void;
  removeMember: (id: string) => void;
}

const INITIAL_TEAM: TeamMember[] = [
  { id: 'a-t1', name: 'Hoorain', email: 'hoorain@gmail.com', title: 'Admin', role: 'admin' },
  { id: 'a-t2', name: 'Samad', email: 'samad@gmail.com', title: 'Support', role: 'support' },
  { id: 'a-t3', name: 'Noor', email: 'noor@gmail.com', title: 'ReadOnly', role: 'readonly' },
];

const INITIAL_REQUESTS: PendingRequest[] = [
  { id: 'r1', name: 'Zainab Aslam', email: 'zainab@pricely.pk', requestedRole: 'admin', requestedAt: '2 hours ago' },
];

const TeamContext = createContext<TeamContextValue | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const [team, setTeam] = useState<TeamMember[]>(INITIAL_TEAM);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>(INITIAL_REQUESTS);
  const pendingRequestsRef = useRef<PendingRequest[]>(INITIAL_REQUESTS);
  const teamRef = useRef<TeamMember[]>(INITIAL_TEAM);
  const { logActivity } = useActivityStore();
  const { accountExists } = useAccountsStore();

  const requestAccess = (name: string, email: string, role: TeamRole, _password?: string): RequestAccessResult => {
    const normalizedEmail = email.trim().toLowerCase();
    const currentPending = pendingRequestsRef.current;
    const currentTeam = teamRef.current;

    if (currentPending.some((request) => request.email.toLowerCase() === normalizedEmail)) {
      return { accepted: false, reason: 'duplicate-pending' };
    }
    if (currentTeam.some((member) => member.email.toLowerCase() === normalizedEmail)) {
      return { accepted: false, reason: 'duplicate-team' };
    }
    if (accountExists(normalizedEmail)) {
      return { accepted: false, reason: 'account-exists' };
    }

    const nextRequest = {
      id: `r-${Date.now()}`,
      name,
      email: normalizedEmail,
      requestedRole: role,
      requestedAt: 'just now',
    };
    pendingRequestsRef.current = [...currentPending, nextRequest];
    setPendingRequests(pendingRequestsRef.current);
    return { accepted: true, reason: 'accepted' };
    // TODO: call your request-admin-access API here
  };

  const approveRequest = (id: string) => {
    const req = pendingRequestsRef.current.find((r) => r.id === id);
    if (req) {
      const nextTeam = [...teamRef.current, { id: req.id, name: req.name, email: req.email, title: '—', role: req.requestedRole }];
      teamRef.current = nextTeam;
      setTeam(nextTeam);
      logActivity(`Approved ${req.name}'s ${req.requestedRole} access request`);
    }
    const nextPending = pendingRequestsRef.current.filter((r) => r.id !== id);
    pendingRequestsRef.current = nextPending;
    setPendingRequests(nextPending);
    // TODO: call your approve-team-request API here
  };

  const rejectRequest = (id: string) => {
    const req = pendingRequestsRef.current.find((r) => r.id === id);
    if (req) logActivity(`Rejected ${req.name}'s access request`);
    const nextPending = pendingRequestsRef.current.filter((r) => r.id !== id);
    pendingRequestsRef.current = nextPending;
    setPendingRequests(nextPending);
    // TODO: call your reject-team-request API here
  };

  const changeRole = (id: string, role: TeamRole) => {
    const member = teamRef.current.find((m) => m.id === id);
    const nextTeam = teamRef.current.map((m) => (m.id === id ? { ...m, role } : m));
    teamRef.current = nextTeam;
    setTeam(nextTeam);
    if (member && member.role !== role) logActivity(`Changed ${member.name}'s role to ${role}`);
    // TODO: call your update-team-role API here
  };

  const removeMember = (id: string) => {
    const member = teamRef.current.find((m) => m.id === id);
    const nextTeam = teamRef.current.filter((m) => m.id !== id);
    teamRef.current = nextTeam;
    setTeam(nextTeam);
    if (member) logActivity(`Removed ${member.name} from the team`);
    // TODO: call your remove-team-member API here
  };

  return (
    <TeamContext.Provider
      value={{ team, pendingRequests, requestAccess, approveRequest, rejectRequest, changeRole, removeMember }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeamStore() {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error('useTeamStore must be used within a TeamProvider');
  return ctx;
}
