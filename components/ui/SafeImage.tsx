import React, { useState } from 'react';
import { Image as ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from "@/lib/utils";

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallbackIcon?: React.ReactNode;
    fallbackText?: string;
    containerClassName?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({ 
    src, 
    alt, 
    className, 
    containerClassName,
    fallbackIcon,
    fallbackText = "Imagem Expirada",
    ...props 
}) => {
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const handleError = () => {
        setHasError(true);
        setIsLoading(false);
    };

    const handleLoad = () => {
        setIsLoading(false);
    };

    if (!src || hasError) {
        return (
            <div className={cn(
                "w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 border border-slate-100 rounded-lg p-2 text-center",
                containerClassName
            )}>
                {fallbackIcon || <AlertCircle size={24} className="mb-2 opacity-50" />}
                <span className="text-[10px] font-medium leading-tight">{fallbackText}</span>
            </div>
        );
    }

    return (
        <div className={cn("relative w-full h-full overflow-hidden", containerClassName)}>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50 animate-pulse">
                    <ImageIcon className="text-slate-200" size={24} />
                </div>
            )}
            <img
                src={src}
                alt={alt}
                className={cn(
                    "w-full h-full object-cover transition-opacity duration-300",
                    isLoading ? "opacity-0" : "opacity-100",
                    className
                )}
                onError={handleError}
                onLoad={handleLoad}
                {...props}
            />
        </div>
    );
};
