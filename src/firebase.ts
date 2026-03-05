import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// ---------------------------------------------------------
// 🚀 [필독] Firebase 설정값 입력 방법
// ---------------------------------------------------------
// 1. Firebase 콘솔에서 복사한 내용을 아래 'firebaseConfig' 부분에 덮어쓰세요.
// 2. 각 항목의 "YOUR_..." 부분을 실제 값으로 바꿔주셔야 앱이 작동합니다.
// ---------------------------------------------------------

const firebaseConfig = {
  apiKey: "AIzaSyDqHmt165-D2pyH3JWiKo5afnGLFyTr0DU",
  authDomain: "classcoins-ff01d.firebaseapp.com",
  databaseURL: "https://classcoins-ff01d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "classcoins-ff01d",
  storageBucket: "classcoins-ff01d.firebasestorage.app",
  messagingSenderId: "870035797307",
  appId: "1:870035797307:web:d1c6c2300c63d539c7f31e"
};

// 설정값이 기본값인 경우 경고를 띄워주는 로직 (삭제 가능)
if (firebaseConfig.apiKey.includes("여기에")) {
  console.warn("⚠️ Firebase 설정이 완료되지 않았습니다. src/firebase.ts 파일을 수정해주세요!");
}

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
