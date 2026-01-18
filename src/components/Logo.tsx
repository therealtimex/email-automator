import { cn } from '../lib/utils';

interface LogoProps {
    className?: string;
}

export function Logo({ className }: LogoProps) {
    return (
        <svg 
            width="512" 
            height="512" 
            viewBox="0 0 512 512" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={cn("w-9 h-9", className)}
        >
            {/* Main Envelope Shape */}
            <path 
                d="M112 112H400C426.51 112 448 133.49 448 160V352C448 378.51 426.51 400 400 400H112C85.4903 400 64 378.51 64 352V160C64 133.49 85.4903 112 112 112Z" 
                className="stroke-foreground"
                strokeWidth="32" 
                strokeLinecap="round" 
                strokeLinejoin="round"
            />

            {/* The Flap (Open) */}
            <path 
                d="M64 160 L200 270" 
                className="stroke-foreground"
                strokeWidth="32" 
                strokeLinecap="round" 
                strokeLinejoin="round"
            />
            <path 
                d="M448 160 L312 270" 
                className="stroke-foreground"
                strokeWidth="32" 
                strokeLinecap="round" 
                strokeLinejoin="round"
            />

            {/* The AI Spark (Purple) */}
            <path 
                d="M256 128 C256 128 276 170 306 178 C276 186 256 228 256 228 C256 228 236 186 206 178 C236 170 256 128 256 128 Z" 
                fill="#9333ea" 
            >
                <animateTransform 
                    attributeName="transform" 
                    type="translate" 
                    values="0 0; 0 -10; 0 0" 
                    dur="3s" 
                    repeatCount="indefinite"
                />
            </path>
        </svg>
    );
}
