import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-16">
        <div className="flex flex-col items-center text-center">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-64 mb-8 mix-blend-luminosity"
          >
            <source src="/Logomoving.mp4" type="video/mp4" />
            <img src="/Tribbailogo.png" alt="Tribbai Logo" className="w-64" />
          </video>
          <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
            Welcome to Tribbai
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl">
            Create, customize, and chat with AI personalities. Experience dynamic conversations
            that adapt and learn from your interactions.
          </p>
          <div className="flex gap-4">
            <Link to="/signup">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                Get Started
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
            <h3 className="text-xl font-semibold mb-4">Create Custom Roles</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Design unique AI personalities with specific traits, knowledge, and behaviors.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
            <h3 className="text-xl font-semibold mb-4">Dynamic Conversations</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Engage in natural, context-aware discussions that evolve over time.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
            <h3 className="text-xl font-semibold mb-4">Memory System</h3>
            <p className="text-gray-600 dark:text-gray-300">
              AI characters remember past interactions and build relationships over time.
            </p>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="max-w-3xl mx-auto">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold">Create Your Account</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Sign up and start exploring the world of AI personalities.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold">Design Your Roles</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Create and customize AI characters with unique personalities.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold">Start Chatting</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Begin conversations and watch your AI companions learn and evolve.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;