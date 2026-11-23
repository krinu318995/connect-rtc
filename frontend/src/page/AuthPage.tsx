import React, { useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../assets/style/AuthPage.css";

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickName, setNickName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      if (isLogin) {
        const res = await api.post("/api/users/login", { email, password });
        localStorage.setItem("accessToken", res.data.accessToken);
        if (res.data.userId) {
          localStorage.setItem("userId", String(res.data.userId));
        }
        if (res.data.nickName) {
          localStorage.setItem("nickName", String(res.data.nickName));
          navigate("/lobby");
        }
      } else {
        await api.post("/api/users/signup", {
          email,
          password,
          nickName,
        });
        alert("회원가입이 완료되었습니다.");
        setIsLogin(true);
        setPassword("");
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message || "요청 처리 중 오류가 발생했습니다.";
      setErrorMessage(msg);
    }
  };
  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2 className="auth-title">
          {isLogin ? "ConnectRTC 로그인" : "ConnectRTC 회원가입"}
        </h2>
        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            className="auth-input"
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            className="auth-input"
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {!isLogin && (
            <input
              type="text"
              className="auth-input"
              placeholder="닉네임"
              value={nickName}
              onChange={(e) => setNickName(e.target.value)}
              required
            />
          )}
          {errorMessage && <p className="auth-error">{errorMessage}</p>}

          <button className="auth-submit-btn" type="submit">
            {" "}
            {isLogin ? "로그인" : "회원가입"}
          </button>
        </form>
        <div className="auth-switch-wrapper">
          <button
            type="button"
            className="auth-toggle-btn"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMessage("");
            }}
          >
            {isLogin
              ? "계정이 없으신가요? 회원가입"
              : "이미 계정이 있으신가요? 로그인"}
          </button>
        </div>
      </div>
    </div>
  );
}
