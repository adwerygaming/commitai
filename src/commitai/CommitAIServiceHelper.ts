const CommitAIHelper = {
    /**
     * Pluralizes a word based on count.
     * @param count - The count to check
     * @param singular - The singular form
     * @param plural - Optional plural form (defaults to singular + 's')
     * @returns The pluralized string
     */
    pluralize(count: number, singular: string, plural ?: string): string {
        return count === 1 ? singular : (plural || `${singular}s`);
    },
}

export default CommitAIHelper