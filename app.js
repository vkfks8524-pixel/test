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
  getDoc,
  setDoc,
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

// 현재 로그인한 사용자 정보 및 역할 ('student' 또는 'teacher')
let currentUser = null;
let currentRole = "student";

// Firestore의 users/{uid} 문서에서 사용자의 역할(교사/학생)을 확인합니다.
async function checkUserRole(user) {
  if (!user) {
    currentRole = "student";
    return;
  }

  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      currentRole = snap.data().role || "student";
    } else {
      // 신규 사용자는 기본값 'student'로 등록합니다.
      currentRole = "student";
      await setDoc(userRef, {
        role: "student",
        name: user.displayName || "익명",
        email: user.email || ""
      });
    }
  } catch (err) {
    console.error("사용자 역할 조회 실패:", err);
    currentRole = "student";
  }
}

// 실습 편의용: 콘솔에서 window.changeMyRole('teacher') 를 실행하면 즉시 교사/학생으로 역할을 바꿀 수 있습니다.
window.changeMyRole = async function (newRole) {
  if (!currentUser) {
    alert("먼저 로그인해 주세요.");
    return;
  }
  const userRef = doc(db, "users", currentUser.uid);
  await setDoc(userRef, { role: newRole }, { merge: true });
  currentRole = newRole;
  renderUserArea();
  render();
  alert(`역할이 '${newRole}'(으)로 변경되었습니다.`);
};


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

    // 교사 / 학생 역할 뱃지 표시
    const roleBadge = document.createElement("span");
    roleBadge.style.fontSize = "12px";
    roleBadge.style.padding = "2px 6px";
    roleBadge.style.borderRadius = "4px";
    roleBadge.style.fontWeight = "bold";

    if (currentRole === "teacher") {
      roleBadge.textContent = "교사 (teacher)";
      roleBadge.style.background = "#e3f2fd";
      roleBadge.style.color = "#1565c0";
    } else {
      roleBadge.textContent = "학생 (student)";
      roleBadge.style.background = "#f1f8e9";
      roleBadge.style.color = "#33691e";
    }
    userArea.appendChild(roleBadge);

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
onAuthStateChanged(auth, async function (user) {
  currentUser = user;
  if (user) {
    await checkUserRole(user);
  } else {
    currentRole = "student";
  }
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

  // 교사(teacher)는 모든 메모를 삭제할 수 있고, 학생(student)은 본인이 작성한 메모만 삭제할 수 있습니다.
  const isTeacher = currentRole === "teacher";
  const isMyMemo = currentUser && memo.uid === currentUser.uid;
  const canDelete = currentUser && (isTeacher || isMyMemo || !memo.uid);

  if (canDelete) {
    const del = document.createElement("button");
    del.textContent = "×";
    del.title = isTeacher ? "선생님 권한으로 삭제" : "삭제하기";
    // 이벤트 리스너 등록 (addEventListener 방식)
    del.addEventListener("click", async function () {
      try {
        await deleteMemo(memo.id);
        render();
      } catch (err) {
        alert("삭제 권한이 없습니다.");
        console.error("삭제 실패:", err);
      }
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
