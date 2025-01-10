import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sparkles, MessageSquare, Zap } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0EA5E9] via-[#33C3F0] to-[#1EAEDB]">
      {/* Logo Section */}
      <div className="pt-8 flex justify-center animate-fade-in">
        <img 
          src="/Logotribbai.png" 
          alt="Tribbai Logo" 
          className="w-32 h-32 object-contain hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-12 pb-16">
        <div className="flex flex-col items-center text-center">
          {/* Tag line */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-white" />
            <span className="text-sm text-white">Revolutionizing team collaboration with AI</span>
          </div>

          {/* Main heading */}
          <h1 className="text-6xl font-bold mb-6 text-white animate-in">
            Every Dream Needs a{" "}
            <span className="text-[#D3E4FD] animate-pulse">Team!</span>
          </h1>
          
          <p className="text-xl text-white/90 mb-8 max-w-2xl animate-fade-in">
            Collaborate with AI roles to strategize, plan, and execute your ideas.
          </p>

          <div className="flex gap-4 animate-fade-in">
            <Link to="/signup">
              <Button 
                size="lg" 
                className="bg-white text-[#0EA5E9] hover:bg-white/90 hover:scale-105 transition-all duration-300"
              >
                Get Started
              </Button>
            </Link>
            <Link to="/login">
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-white/10 hover:scale-105 transition-all duration-300"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-center text-white mb-12 animate-fade-in">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Create AI Roles Card */}
          <div className="glass p-8 rounded-2xl transform hover:scale-105 transition-all duration-300 animate-in">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-4 text-white">Create AI Roles</h3>
            <p className="text-white/80">
              Build your dream team with custom or pre-built AI roles
            </p>
          </div>

          {/* Start Conversations Card */}
          <div className="glass p-8 rounded-2xl transform hover:scale-105 transition-all duration-300 animate-in" style={{ animationDelay: "150ms" }}>
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-6">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-4 text-white">Start Conversations</h3>
            <p className="text-white/80">
              Chat individually or create dynamic team discussions
            </p>
          </div>

          {/* Execute & Scale Card */}
          <div className="glass p-8 rounded-2xl transform hover:scale-105 transition-all duration-300 animate-in" style={{ animationDelay: "300ms" }}>
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