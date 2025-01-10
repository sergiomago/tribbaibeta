import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sparkles, MessageSquare, Zap } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6E59A5] via-[#7E69AB] to-[#9b87f5]">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-16">
        <div className="flex flex-col items-center text-center">
          {/* Tag line */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-lg mb-8">
            <Sparkles className="w-4 h-4 text-white" />
            <span className="text-sm text-white">Revolutionizing team collaboration with AI</span>
          </div>

          {/* Main heading */}
          <h1 className="text-6xl font-bold mb-6 text-white">
            Every Dream Needs a{" "}
            <span className="text-[#D6BCFA]">Team!</span>
          </h1>
          
          <p className="text-xl text-white/90 mb-8 max-w-2xl">
            Collaborate with AI roles to strategize, plan, and execute your ideas.
          </p>

          <div className="flex gap-4">
            <Link to="/signup">
              <Button size="lg" className="bg-white text-[#6E59A5] hover:bg-white/90">
                Get Started
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-center text-white mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-4 text-white">Create AI Roles</h3>
            <p className="text-white/80">
              Build your dream team with custom or pre-built AI roles
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-6">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-4 text-white">Start Conversations</h3>
            <p className="text-white/80">
              Chat individually or create dynamic team discussions
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-4 text-white">Execute & Scale</h3>
            <p className="text-white/80">
              Manage all your conversations and roles in one place
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;