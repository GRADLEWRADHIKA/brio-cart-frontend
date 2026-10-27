import type { DocumentKind, DocumentStatus, Role, VerificationStatus } from '@shared/core';
import { api, request } from './client';
import { API_BASE } from '@/config/env';

export interface VerificationDocumentView {
  id: string;
  kind: DocumentKind;
  reference: string | null;
  fileName: string;
  mimeType: string;
  size: number;
  status: DocumentStatus;
  note: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface VerificationSummary {
  role: 'SHOP_OWNER' | 'RIDER';
  /** Shops: NOT_SUBMITTED | PENDING | APPROVED | REJECTED; riders: their rider status. */
  status: VerificationStatus | string;
  note: string | null;
  agreement: { name: string | null; at: string } | null;
  documents: Array<{ kind: DocumentKind; required: boolean; name: string; hint: string; reference?: string; document: VerificationDocumentView | null }>;
  missing: DocumentKind[];
  complete: boolean;
  allApproved: boolean;
  history: VerificationDocumentView[];
}

export interface ReviewQueueItem {
  userId: string;
  name: string;
  phone: string;
  role: Role;
  shop: { id: string; name: string; verificationStatus: string } | null;
  vehicleNumber: string | null;
  status: string;
  pendingDocuments: number;
  agreementAccepted: boolean;
  lastUpload: string | null;
}

/** Shop owners and riders: their own documents. */
export const verificationApi = {
  summary: () => api.get<VerificationSummary>('/verification'),
  upload: (kind: DocumentKind, file: File, reference?: string) => {
    const fd = new FormData();
    fd.append('kind', kind);
    if (reference) fd.append('reference', reference);
    fd.append('file', file);
    return request<{ summary: VerificationSummary }>('/verification/documents', { method: 'POST', body: fd }).then((r) => r.summary);
  },
  accept: (name: string) => api.post<VerificationSummary>('/verification/agreement', { name, accept: true }),
  /** Opens with the session cookie; the file is never public. */
  fileUrl: (id: string) => `${API_BASE}/verification/documents/${id}/file`,
};

/** Super admin review. */
export const reviewApi = {
  queue: () => api.get<{ items: ReviewQueueItem[] }>('/admin/verification').then((r) => r.items),
  detail: (userId: string) =>
    api.get<{ user: { id: string; name: string; phone: string; email: string | null; role: Role; vehicleNumber: string | null; createdAt: string; shop: { id: string; name: string; address: string; phone: string } | null }; summary: VerificationSummary }>(`/admin/verification/${userId}`),
  review: (docId: string, decision: 'APPROVED' | 'REJECTED', note?: string) => api.post<{ summary: VerificationSummary }>(`/admin/documents/${docId}/review`, { decision, note }).then((r) => r.summary),
  decide: (userId: string, approve: boolean, note?: string) => api.post<{ summary: VerificationSummary }>(`/admin/verification/${userId}/decision`, { approve, note }).then((r) => r.summary),
  fileUrl: (docId: string) => `${API_BASE}/admin/documents/${docId}/file`,
};
