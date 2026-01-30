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
                stroke="currentColor"
                strokeWidth="32"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* The Flap */}
            <path
                d="M64 160 L240 290 C250 295 262 295 272 290 L448 160"
                stroke="currentColor"
                strokeWidth="28"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Simple AI Spark */}
            <path
                d="M256 160 C256 160 270 190 290 195 C270 200 256 230 256 230 C256 230 242 200 222 195 C242 190 256 160 256 160 Z"
                fill="currentColor"
                className="opacity-50"
            />
        </svg>
    );
}
