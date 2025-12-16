import { useEffect, useState } from 'react';
import { createConfetti } from '../lib/utils';

type ConfettiProps = {
  active: boolean;
  duration?: number;
};

export default function Confetti({ active, duration = 3000 }: ConfettiProps) {
  const [pieces, setPieces] = useState<ReturnType<typeof createConfetti>>([]);

  useEffect(() => {
    if (active) {
      setPieces(createConfetti(60));
      const timer = setTimeout(() => setPieces([]), duration);
      return () => clearTimeout(timer);
    } else {
      setPieces([]);
    }
  }, [active, duration]);

  if (pieces.length === 0) return null;

  return (
    <div className="confettiContainer">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="confettiPiece"
          style={{
            left: `${piece.left}%`,
            backgroundColor: piece.color,
            width: piece.size,
            height: piece.size,
            animationDelay: `${piece.delay}s`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px'
          }}
        />
      ))}
    </div>
  );
}
