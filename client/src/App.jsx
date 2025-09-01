import React, { useContext } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import HomePage from './pages/HomePage.jsx';
import { Toaster } from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext.jsx';

const App = () => {
    const { authUser, isAuthLoading } = useContext(AuthContext);

    if (isAuthLoading) {
        return (
            <div className='flex items-center justify-center h-screen w-full'>
                <span className='loading loading-spinner text-violet-600'></span>
            </div>
        )
    }

    return (
        <div className="bg-[url('./src/assets/bgImage.svg')] bg-contain">
            <Toaster />
            <Routes>
                <Route path="/" element={authUser ? <HomePage /> : <LoginPage />} />
                <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
                <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
            </Routes>
        </div>
    );
};

export default App;
