
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  getDocs,
  writeBatch,
  getDocFromServer
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { Patient, Visit, Drug, Supply, Procedure, Transaction, ClinicInfo, User, LabTest, CheckupProgram, StockLog } from "../types";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('the client is offline') || errorMessage.includes('unavailable')) {
      console.error("Firestore connection failed: The backend is unreachable. This may be due to network restrictions or incorrect Firebase configuration.");
    }
  }
}
testConnection();

const stripUndefined = (obj: any): any => {
  const newObj: any = Array.isArray(obj) ? [] : {};
  Object.keys(obj).forEach(key => {
    if (obj[key] === undefined) return;
    if (obj[key] !== null && typeof obj[key] === 'object') {
      newObj[key] = stripUndefined(obj[key]);
    } else {
      newObj[key] = obj[key];
    }
  });
  return newObj;
};

export const syncCollection = <T extends { id: string }>(
  collectionName: string, 
  callback: (data: T[]) => void
) => {
  const q = query(collection(db, collectionName));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
    callback(data);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  });
};

export const saveDocument = async (collectionName: string, data: { id: string; [key: string]: any }) => {
  const { id, ...rest } = data;
  try {
    const cleanData = stripUndefined(rest);
    await setDoc(doc(db, collectionName, id), cleanData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${id}`);
  }
};

export const deleteDocument = async (collectionName: string, id: string) => {
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
  }
};

export const seedDatabase = async (
  initialData: {
    drugs: Drug[];
    supplies: any[];
    procedures: Procedure[];
    labTests: LabTest[];
    checkupPrograms: CheckupProgram[];
    users: User[];
    clinicInfo: ClinicInfo;
  }
) => {
  const collections = ['drugs', 'supplies', 'procedures', 'labTests', 'checkupPrograms', 'users'];
  
  for (const colName of collections) {
    try {
      console.log(`Checking if ${colName} is empty...`);
      const snapshot = await getDocs(collection(db, colName));
      if (snapshot.empty) {
        console.log(`Seeding ${colName}...`);
        const batch = writeBatch(db);
        const data = initialData[colName as keyof typeof initialData] as any[];
        console.log(`Data to seed for ${colName}:`, data?.length || 0, "items");
        if (!data || data.length === 0) {
          console.warn(`No data to seed for ${colName}`);
          continue;
        }
        data.forEach(item => {
          const { id, ...rest } = item;
          batch.set(doc(db, colName, id), stripUndefined(rest));
        });
        console.log(`Committing batch for ${colName}...`);
        await batch.commit();
        console.log(`Successfully seeded ${colName}`);
      } else {
        console.log(`${colName} already has data, skipping seed.`);
      }
    } catch (error) {
      console.error(`Error seeding ${colName}:`, error instanceof Error ? error.message : error);
      if (error instanceof Error && error.message.toLowerCase().includes('permission')) {
        handleFirestoreError(error, OperationType.WRITE, colName);
      }
    }
  }

  try {
    const clinicDoc = await getDocs(collection(db, 'clinicInfo'));
    if (clinicDoc.empty) {
      await setDoc(doc(db, 'clinicInfo', 'main'), initialData.clinicInfo);
    }
  } catch (error) {
    console.error(`Error seeding clinicInfo:`, error);
  }
};

export const saveStockLog = async (
  item: { id: string; name: string },
  changeAmount: number,
  type: 'addition' | 'reduction' | 'requisition' | 'pharmacy_dispense' | 'direct_sale' | 'delete_item' | 'edit_item',
  note: string,
  itemType: 'Drug' | 'Supply' = 'Drug',
  previousStock: number = 0,
  newStock: number = 0,
  user: string = 'Staff'
) => {
  const logId = Math.random().toString(36).substr(2, 9);
  const log: StockLog = {
    id: logId,
    date: new Date().toISOString(),
    itemId: item.id,
    itemName: item.name,
    itemType,
    changeAmount,
    previousStock,
    newStock,
    type,
    note,
    user
  };
  await saveDocument('stockLogs', log);
};
