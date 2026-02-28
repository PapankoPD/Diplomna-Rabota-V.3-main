import React, { useState } from 'react';
import { Star } from 'lucide-react';
import './StarRating.css';

export const StarRating = ({
    rating = 0,
    onRate,
    readonly = false,
    size = 'medium'
}) => {
    const [hoverRating, setHoverRating] = useState(0);

    const handleClick = (value) => {
        if (!readonly && onRate) {
            onRate(value);
        }
    };

    const handleMouseEnter = (value) => {
        if (!readonly) {
            setHoverRating(value);
        }
    };

    const handleMouseLeave = () => {
        setHoverRating(0);
    };

    const displayRating = hoverRating || rating;

    return (
        <div className={`star-rating star-rating-${size}`}>
            {[1, 2, 3, 4, 5].map((value) => (
                <Star
                    key={value}
                    className={`star ${value <= displayRating ? 'star-filled' : 'star-empty'} ${!readonly ? 'star-interactive' : ''}`}
                    onClick={() => handleClick(value)}
                    onMouseEnter={() => handleMouseEnter(value)}
                    onMouseLeave={handleMouseLeave}
                    fill={value <= displayRating ? 'currentColor' : 'none'}
                />
            ))}
        </div>
    );
};
