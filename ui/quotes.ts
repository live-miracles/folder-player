const QUOTES = [
    'The life of Rama shows the immense Possibility of being Human – the capability to rise above All Challenges.',
    'Devotion is when your involvement with life is so absolute that you yourself do not matter anymore.',
    'Water is life-making material. Saving water resources is Saving Life.',
    'When you were a child, someone had to work hard to make you miserable. Today, someone has to work hard to make you happy. Time to understand that the source of Human experience is within oneself.',
    'The more exclusive you make yourself in thought and emotion, the more excluded from Life you become.',
    'If you want success and joy in whatever you do, the most important thing is Clarity of Perception.',
    'This is the nature of your Mind: if you try to avoid certain thoughts, only those will occur.',
    'When you spend time in the forest, you realize you are just one more Life. It is a huge spiritual step to feel for Life around you the way you feel for yourself.',
    'The Mind, which is the greatest Miracle, has become a misery-manufacturing machine for too many people.',
    'Do not save your Joy for later. When you are joyful, your whole life is a celebration.',
    'Whatever your life situation, there is no reason to be miserable. You came with nothing, so you are always on the profit side.',
    'When it comes to Joy, Love, and the Exuberance of Life, you are the Source of it.',
    'The best way to be receptive to Grace is to become less of yourself.',
    'Once you see the limitations in which you exist, a natural longing to Go Beyond them arises – and that is your biggest fortune.',
    'Those who are absolutely sure of everything have put their Intelligence in cold storage.',
    'Living an Exuberant Life is only possible when you are able to dance upon the uncertainties of life.',
    'What is a friend? A friend is another confused human being like you. If the two of you can be with each other sincerely, that is when real friendship happens.',
    'Relationships are not about compatibility, companionship, or seeking happiness from each other. They are an opportunity to create a Union that paves the way to a greater possibility.',
    'Whether it is song, dance, or work – if you throw yourself into it with total Abandon, your life will become wonderful.',
    'If who you are is clearly established within yourself, what people say will not matter.',
    'Love is the longing to include someone as a part of you – to expand the boundaries of who you are beyond yourself.',
    'If there is love in your heart, no need for kindness. Love guides you through life.',
    'We may not always be able to change the physical situations around us. But no one can stop us from changing the way we Experience them.',
    'Climbing has a cost, but falling is free. You just need to learn to fall into beautiful spaces – and the most beautiful space is Within You.',
    'When you become silent within yourself, you will perceive Life in a way you cannot imagine – in utmost profoundness.',
    'Wherever you are, whatever you are exposed to, pick up the best from every situation. Then, Life is Learning.',
];

export function getRandomQuote() {
    return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}
