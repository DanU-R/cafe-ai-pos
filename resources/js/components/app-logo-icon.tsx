import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
                fill="currentColor"
                d="M5 8.5h10.75v4.75a5.75 5.75 0 0 1-11.5 0V9.25A.75.75 0 0 1 5 8.5Zm12.25 1.25h.5a2.75 2.75 0 0 1 0 5.5h-.7c.13-.64.2-1.31.2-2V9.75Zm0 1.5v2c0 .17 0 .34-.01.5h.51a1.25 1.25 0 1 0 0-2.5h-.5ZM6.75 3.25a.75.75 0 0 1 1.5 0v1.5a.75.75 0 0 1-1.5 0v-1.5Zm4.5 0a.75.75 0 0 1 1.5 0v1.5a.75.75 0 0 1-1.5 0v-1.5ZM4 20.25a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 20.25Z"
            />
        </svg>
    );
}
