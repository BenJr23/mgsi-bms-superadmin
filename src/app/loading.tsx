export default function Loading() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-white select-none">
            <div className="text-center">
                <div className="mb-8">
                    <div className="loader"></div>
                </div>

                <div className="space-y-2">
                    <p className="text-sm text-black">
                        Please wait a moment...
                    </p>
                </div>
            </div>
        </main>
    );
}