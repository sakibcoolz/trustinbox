export async function fetchDocuments(_opts?: {
  search?: string; classification?: string; status?: string; limit?: number; offset?: number;
}) {
  return [];
}

export async function fetchDocument(_id: string) {
  return null;
}

export async function fetchDocumentVersions(_documentId: string) {
  return [];
}

export async function fetchDocumentShares(_documentId: string) {
  return [];
}
