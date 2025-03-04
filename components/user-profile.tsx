import { useState, useRef, useEffect } from "react";
import { User, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { useUser } from "@/contexts/user-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export function UserProfile() {
  const { user, refreshSession } = useAuth();
  const { isPremium } = useUser();
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Extract username from metadata or email
  const username = user?.user_metadata?.username || 
                   user?.email?.split('@')[0] || 
                   "Guest";
  
  // Load the current avatar when the component mounts or user changes
  useEffect(() => {
    const loadAvatar = async () => {
      if (!user) return;
      
      setImageError(false);
      
      // Check if user has an avatar URL in metadata
      if (user.user_metadata?.avatar_url) {
        console.log("Avatar URL from metadata:", user.user_metadata.avatar_url);
        // Add timestamp to prevent caching
        const timestampedUrl = `${user.user_metadata.avatar_url}?t=${Date.now()}`;
        setCurrentAvatar(timestampedUrl);
      }
    };
    
    loadAvatar();
  }, [user]);

  const handleProfileClick = () => {
    setShowUploadDialog(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!profilePicture || !user) return;
    
    setIsUploading(true);
    console.log("Starting upload process...");
    
    try {
      // Convert data URL to blob
      const response = await fetch(profilePicture);
      const blob = await response.blob();
      
      // Generate a unique filename with timestamp to avoid caching issues
      const timestamp = Date.now();
      const filename = `profile_${timestamp}.jpg`;
      const file = new File([blob], filename, { type: 'image/jpeg' });
      
      console.log(`Uploading new profile image: ${filename}`);
      
      // Upload to Supabase Storage with public access
      const { data, error } = await supabase.storage
        .from('profiles')
        .upload(`${user.id}/${filename}`, file, {
          upsert: true,
          cacheControl: 'no-cache'
        });
      
      if (error) {
        console.error('Error uploading profile picture:', error);
        return;
      }
      
      console.log("Upload successful:", data);
      
      // Get the public URL of the uploaded image
      const { data: publicUrlData } = supabase.storage
        .from('profiles')
        .getPublicUrl(`${user.id}/${filename}`);
          
      if (!publicUrlData.publicUrl) {
        console.error('Could not get public URL for uploaded file');
        return;
      }
      
      console.log("Generated public URL:", publicUrlData.publicUrl);
      
      // Update user metadata in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          avatar_url: publicUrlData.publicUrl
        }
      });
      
      if (updateError) {
        console.error('Error updating user metadata:', updateError);
        return;
      }
      
      console.log("User metadata updated with avatar URL");
      
      // Find and delete old profile images to clean up storage
      try {
        const { data: fileList } = await supabase.storage
          .from('profiles')
          .list(user.id);
          
        if (fileList) {
          const oldFiles = fileList.filter(file => 
            file.name.startsWith('profile_') && 
            file.name !== filename
          );
          
          if (oldFiles.length > 0) {
            const filesToDelete = oldFiles.map(file => `${user.id}/${file.name}`);
            console.log("Cleaning up old profile images:", filesToDelete);
            
            const { error: deleteError } = await supabase.storage
              .from('profiles')
              .remove(filesToDelete);
              
            if (deleteError) {
              console.error("Error deleting old files:", deleteError);
            }
          }
        }
      } catch (cleanupError) {
        console.error("Error during storage cleanup:", cleanupError);
      }
      
      // Update local state with the new avatar URL (with timestamp for cache busting)
      const avatarWithTimestamp = `${publicUrlData.publicUrl}?t=${timestamp}`;
      setCurrentAvatar(avatarWithTimestamp);
      setImageError(false);
      
      // Force a session refresh
      if (refreshSession) {
        await refreshSession();
        console.log("Session refreshed");
      }
      
    } catch (error) {
      console.error('Error in upload process:', error);
    } finally {
      setIsUploading(false);
      setShowUploadDialog(false);
      setProfilePicture(null);
    }
  };

  const handleImageError = () => {
    console.log("Image failed to load:", currentAvatar);
    setImageError(true);
    setCurrentAvatar(null);
  };

  return (
    <div className="p-4 border-b space-y-4">
      {/* User Profile */}
      <div className="flex items-start gap-3">
        <div 
          className="flex items-center justify-center w-10 h-10 rounded-full border mt-0 cursor-pointer overflow-hidden bg-muted" 
          onClick={handleProfileClick}
          title="Update profile picture"
        >
          {currentAvatar && !imageError ? (
            <img 
              src={currentAvatar} 
              alt="Profile" 
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
          ) : (
            <User size={24} className="text-foreground" />
          )}
        </div>
        <div className="flex flex-col">
          <div className="relative">
            <Badge variant="outline" className="absolute -top-3 -left-1 text-[10px] px-1 py-0 font-medium">
              {isPremium ? "PREMIUM" : "FREE"}
            </Badge>
            <span className="text-sm mt-1 block">{username}</span>
          </div>
        </div>
      </div>

      {/* Profile Picture Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Profile Picture</DialogTitle>
            <DialogDescription>
              Upload a new profile picture. Recommended size: 200x200px.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-24 h-24 rounded-full border-2 flex items-center justify-center overflow-hidden bg-muted">
              {profilePicture ? (
                <img src={profilePicture} alt="Preview" className="w-full h-full object-cover" />
              ) : currentAvatar && !imageError ? (
                <img 
                  src={currentAvatar} 
                  alt="Current profile" 
                  className="w-full h-full object-cover"
                  onError={handleImageError} 
                />
              ) : (
                <User size={48} className="text-muted-foreground" />
              )}
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                className="flex gap-2"
              >
                <Upload size={16} />
                Choose Image
              </Button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowUploadDialog(false);
                setProfilePicture(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={handleUpload}
              disabled={!profilePicture || isUploading}
              className="bg-black text-white hover:bg-black hover:scale-105 transition-transform duration-200"
            >
              {isUploading ? "Uploading..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}