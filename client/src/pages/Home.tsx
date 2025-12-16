import { Link } from 'react-router-dom';
import { Target, Gamepad2, PenLine, Check } from 'lucide-react';

export default function Home() {
  return (
    <div className="shell">
      <div className="heroSection">
        <h1 className="heroTitle">OpenQuiz</h1>
        <p className="heroSubtitle">Free live quizzes for everyone</p>
      </div>

      <main className="card homeCard">
        <div className="homeGrid">
          <Link className="homeButton hostBtn" to="/host">
            <span className="homeIcon"><Target size={40} /></span>
            <span className="homeLabel">Host a Quiz</span>
            <span className="homeDesc">Start a live game</span>
          </Link>

          <Link className="homeButton joinBtn" to="/join">
            <span className="homeIcon"><Gamepad2 size={40} /></span>
            <span className="homeLabel">Join a Quiz</span>
            <span className="homeDesc">Enter room code</span>
          </Link>

          <Link className="homeButton editorBtn" to="/editor">
            <span className="homeIcon"><PenLine size={40} /></span>
            <span className="homeLabel">Create Quiz</span>
            <span className="homeDesc">Build your own</span>
          </Link>
        </div>

        <div className="homeFeatures">
          <div className="featureItem">
            <Check size={16} /> No login required
          </div>
          <div className="featureItem">
            <Check size={16} /> Works on mobile
          </div>
          <div className="featureItem">
            <Check size={16} /> Up to 400 players
          </div>
        </div>
      </main>
    </div>
  );
}
