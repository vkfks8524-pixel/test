// ===================================================
// 우리 반 담벼락
//
// Firebase Firestore와 연동하여 메모를 저장하고 실시간으로 표시합니다.
// ===================================================

// Firebase SDK 모듈 불러오기 (CDN ES Module 방식)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyAYWa9qs-6XzphjBdJyQ3dJyhUV9wjuWsg",
  authDomain: "gozjxhsdustn.firebaseapp.com",
  projectId: "gozjxhsdustn",
  storageBucket: "gozjxhsdustn.firebasestorage.app",
  messagingSenderId: "794460789967",
  appId: "1:794460789967:web:1d8e1962c663aae3c1ebba"
};

// Firebase 초기화 및 Firestore 객체 생성
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// ===================================================
// 데이터를 다루는 함수 세 개
// Firestore를 사용하여 메모를 읽고, 쓰고, 지웁니다.
// ===================================================

// 메모를 읽어 옵니다.
// Firestore의 'memos' 컬렉션에서 올린 시각(createdAt) 순서대로 가져옵니다.
async function loadMemos() {
  const q = query(collection(db, "memos"), orderBy("createdAt", "asc"));
  const querySnapshot = await getDocs(q);
  const list = [];
  querySnapshot.forEach(function (docSnap) {
    list.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });
  return list;
}

// 메모를 새로 씁니다.
// 백엔드 2: 여기에 "누가 썼는지"(uid)를 함께 저장하게 됩니다.
async function addMemo(text) {
  await addDoc(collection(db, "memos"), {
    text: text,
    createdAt: Date.now()
  });
}

// 메모를 지웁니다.
// 백엔드 2: 지금은 누구든 남의 메모를 지울 수 있습니다. 이걸 막는 것이 과제입니다.
async function deleteMemo(id) {
  await deleteDoc(doc(db, "memos", id));
}


// ===================================================
// 화면 그리기
// ===================================================

async function render() {
  const wall = document.getElementById("wall");
  wall.innerHTML = "";

  const memos = await loadMemos();
  memos.forEach(function (memo) {
    wall.appendChild(makeMemo(memo));
  });
}

// 메모 한 장 만들기
function makeMemo(memo) {
  const div = document.createElement("div");
  div.className = "memo";

  const del = document.createElement("button");
  del.textContent = "×";
  // 이벤트 리스너 등록 (addEventListener 방식)
  del.addEventListener("click", async function () {
    await deleteMemo(memo.id);
    render();
  });
  div.appendChild(del);

  const span = document.createElement("span");
  span.textContent = memo.text;
  div.appendChild(span);

  return div;
}


// ===================================================
// 메모 쓰는 칸
// 엔터를 누르면 담벼락에 붙습니다 (줄바꿈은 Shift + 엔터)
// ===================================================

const input = document.getElementById("input");

// 이벤트 리스너 등록 (addEventListener 방식)
input.addEventListener("keydown", async function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();

    const text = input.value.trim();
    if (text === "") return;

    input.value = "";
    await addMemo(text);
    render();
  }
});

// 실시간 동기화: 다른 기기나 참가자가 메모를 쓰거나 지워도 바로 반영됩니다.
const q = query(collection(db, "memos"), orderBy("createdAt", "asc"));
onSnapshot(q, function () {
  render();
});

// 첫 화면 그리기
render();
input.focus();
