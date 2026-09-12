// ===================================================
// 우리 반 담벼락
//
// Firebase Firestore 및 Google 로그인을 연동하여
// 실시간 메모 및 사용자별 작성/삭제를 지원합니다.
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
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyAYWa9qs-6XzphjBdJyQ3dJyhUV9wjuWsg",
  authDomain: "gozjxhsdustn.firebaseapp.com",
  projectId: "gozjxhsdustn",
  storageBucket: "gozjxhsdustn.firebasestorage.app",
  messagingSenderId: "794460789967",
  appId: "1:794460789967:web:1d8e1962c663aae3c1ebba"
};

// Firebase 초기화, Firestore 및 Auth 객체 생성
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 현재 로그인한 사용자 정보 (null이면 로그아웃 상태)
let currentUser = null;


// ===================================================
// 사용자 로그인 영역 (userArea) 관리
// ===================================================

const userArea = document.getElementById("userArea");
const input = document.getElementById("input");

// 로그인 상태에 따라 사용자 표시와 버튼 그리기
function renderUserArea() {
  userArea.innerHTML = "";

  if (currentUser) {
    const userSpan = document.createElement("span");
    userSpan.textContent = `${currentUser.displayName || currentUser.email}님 환영합니다!`;
    userArea.appendChild(userSpan);

    const logoutBtn = document.createElement("button");
    logoutBtn.textContent = "로그아웃";
    logoutBtn.addEventListener("click", async function () {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("로그아웃 실패:", err);
      }
    });
    userArea.appendChild(logoutBtn);

    input.disabled = false;
    input.placeholder = "메모를 쓰고 엔터";
  } else {
    const loginSpan = document.createElement("span");
    loginSpan.textContent = "로그인이 필요합니다.";
    userArea.appendChild(loginSpan);

    const loginBtn = document.createElement("button");
    loginBtn.textContent = "Google 로그인";
    loginBtn.addEventListener("click", async function () {
      try {
        await signInWithPopup(auth, provider);
      } catch (err) {
        console.error("로그인 실패:", err);
        alert("로그인에 실패했습니다: " + err.message);
      }
    });
    userArea.appendChild(loginBtn);

    input.disabled = true;
    input.placeholder = "로그인 후 메모를 작성할 수 있습니다";
  }
}

// 로그인 상태 변경 감지 리스너
onAuthStateChanged(auth, function (user) {
  currentUser = user;
  renderUserArea();
  render();
});


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
// 로그인한 사용자의 식별자(uid)와 작성자 이름(author)을 함께 저장합니다.
async function addMemo(text) {
  if (!currentUser) {
    alert("메모를 쓰려면 먼저 로그인해야 합니다.");
    return;
  }

  await addDoc(collection(db, "memos"), {
    text: text,
    uid: currentUser.uid,
    author: currentUser.displayName || "익명",
    createdAt: Date.now()
  });
}

// 메모를 지웁니다.
// 백엔드 2: 본인이 쓴 메모인지 확인 후 삭제합니다.
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

  // 작성자 본인이거나 작성자 정보가 없는 메모만 삭제(×) 버튼 표시
  const canDelete = currentUser && (!memo.uid || memo.uid === currentUser.uid);
  if (canDelete) {
    const del = document.createElement("button");
    del.textContent = "×";
    del.title = "삭제하기";
    // 이벤트 리스너 등록 (addEventListener 방식)
    del.addEventListener("click", async function () {
      await deleteMemo(memo.id);
      render();
    });
    div.appendChild(del);
  }

  const span = document.createElement("span");
  span.textContent = memo.text;
  div.appendChild(span);

  // 작성자 표시
  if (memo.author) {
    const authorDiv = document.createElement("div");
    authorDiv.className = "author";
    authorDiv.textContent = memo.author;
    div.appendChild(authorDiv);
  }

  return div;
}


// ===================================================
// 메모 쓰는 칸
// 엔터를 누르면 담벼락에 붙습니다 (줄바꿈은 Shift + 엔터)
// ===================================================

// 이벤트 리스너 등록 (addEventListener 방식)
input.addEventListener("keydown", async function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();

    const text = input.value.trim();
    if (text === "") return;

    try {
      await addMemo(text);
      input.value = "";
      render();
    } catch (err) {
      alert("메모를 저장하지 못했습니다. (5글자 이상은 규칙에 의해 저장되지 않습니다)");
      console.error("메모 저장 실패:", err);
    }
  }
});

// 실시간 동기화: 다른 기기나 참가자가 메모를 쓰거나 지워도 바로 반영됩니다.
const q = query(collection(db, "memos"), orderBy("createdAt", "asc"));
onSnapshot(q, function () {
  render();
});

// 첫 화면 그리기
renderUserArea();
render();
