/**
 * Firestore Service
 *
 * Centralized Firestore operations. Feature hooks call these functions,
 * screens never import Firestore directly.
 *
 * This provides typed, reusable helpers that can be composed by feature hooks.
 */

import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";

/** Type alias for readability */
type QuerySnapshot = FirebaseFirestoreTypes.QuerySnapshot;
type DocumentSnapshot = FirebaseFirestoreTypes.DocumentSnapshot;

/**
 * Get a reference to a Firestore collection.
 */
export function getCollection(collectionPath: string) {
  return firestore().collection(collectionPath);
}

/**
 * Get a reference to a Firestore document.
 */
export function getDocument(collectionPath: string, docId: string) {
  return firestore().collection(collectionPath).doc(docId);
}

/**
 * Fetch a single document by ID.
 * Returns null if the document doesn't exist.
 */
export async function fetchDocument<T>(
  collectionPath: string,
  docId: string
): Promise<(T & { id: string }) | null> {
  const doc: DocumentSnapshot = await getDocument(collectionPath, docId).get();
  if (!doc.exists()) return null;
  return { id: doc.id, ...(doc.data() as T) };
}

/**
 * Fetch documents from a collection with optional query constraints.
 */
export async function fetchCollection<T>(
  collectionPath: string,
  options?: {
    orderBy?: { field: string; direction?: "asc" | "desc" };
    limit?: number;
    where?: {
      field: string;
      operator: FirebaseFirestoreTypes.WhereFilterOp;
      value: unknown;
    }[];
  }
): Promise<(T & { id: string })[]> {
  let query: FirebaseFirestoreTypes.Query = getCollection(collectionPath);

  if (options?.where) {
    for (const condition of options.where) {
      query = query.where(condition.field, condition.operator, condition.value);
    }
  }

  if (options?.orderBy) {
    query = query.orderBy(
      options.orderBy.field,
      options.orderBy.direction ?? "desc"
    );
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const snapshot: QuerySnapshot = await query.get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as T),
  }));
}

/**
 * Add a new document to a collection.
 * Returns the new document ID.
 */
export async function addDocument<T extends Record<string, unknown>>(
  collectionPath: string,
  data: T
): Promise<string> {
  const ref = await getCollection(collectionPath).add({
    ...data,
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
  return ref.id;
}

/**
 * Set a document with a specific ID.
 */
export async function setDocument<T extends Record<string, unknown>>(
  collectionPath: string,
  docId: string,
  data: T
): Promise<void> {
  await getDocument(collectionPath, docId).set({
    ...data,
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Update an existing document.
 */
export async function updateDocument<T extends Record<string, unknown>>(
  collectionPath: string,
  docId: string,
  data: Partial<T>
): Promise<void> {
  await getDocument(collectionPath, docId).update({
    ...data,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Delete a document.
 */
export async function deleteDocument(
  collectionPath: string,
  docId: string
): Promise<void> {
  await getDocument(collectionPath, docId).delete();
}

/**
 * Subscribe to real-time updates on a document.
 * Returns an unsubscribe function.
 */
export function subscribeToDocument<T>(
  collectionPath: string,
  docId: string,
  callback: (data: (T & { id: string }) | null) => void
): () => void {
  return getDocument(collectionPath, docId).onSnapshot((doc) => {
    if (!doc.exists()) {
      callback(null);
      return;
    }
    callback({ id: doc.id, ...(doc.data() as T) });
  });
}

/** Server timestamp helper */
export const serverTimestamp = firestore.FieldValue.serverTimestamp;

/** Increment helper for atomic counter updates */
export const increment = firestore.FieldValue.increment;
