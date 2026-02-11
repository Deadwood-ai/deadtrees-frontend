import { useState } from "react";
import { Alert, Button, Input, Tag } from "antd";
import { PlayCircleFilled } from "@ant-design/icons";
import ReactPlayer from "react-player";
import { supabase } from "../../hooks/useSupabase";
import { notification } from "antd";
import { Settings } from "../../config";

const Hero = () => {
  const [email, setEmail] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailCheck = (email: string) => {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
  };

  const addSubscriber = async () => {
    if (!emailCheck(email)) {
      notification.error({
        message: "Invalid email",
        description: "Please enter a valid email address.",
        placement: "topRight",
      });
      return;
    }

    setIsSubmitting(true);

    const normalizedEmail = email.trim().toLowerCase();

    const { error: insertError } = await supabase
      .from(Settings.NEWSLETTER_TABLE)
      .insert([{ email: normalizedEmail }]);

    if (insertError) {
      if (insertError.code === "23505") {
        notification.info({
          message: "Already subscribed",
          description: "This email is already subscribed to our newsletter.",
          placement: "topRight",
        });
      } else {
        notification.error({
          message: "Error",
          description: "An error occurred while adding the subscriber.",
          placement: "topRight",
        });
        console.error("Error adding subscriber:", insertError);
      }
    } else {
      notification.success({
        message: "Thank you!",
        description: "Thank you for subscribing! You will receive updates on new features and developments.",
        placement: "topRight",
      });
      setEmail(""); // Clear the input field after successful subscription
    }

    setIsSubmitting(false);
  };

  return (
    <section className="relative w-full overflow-hidden">
      <div className="absolute inset-0 hidden bg-[radial-gradient(900px_at_50%_30%,_var(--tw-gradient-stops))] from-blue-100 via-blue-50 to-white md:block"></div>
      <div className="relative z-10 m-auto flex max-w-6xl flex-col items-center px-4 pb-12 md:px-0">
        <div className="md:hidden">
          <Alert
            message="Mobile version is limited"
            description="Please use a desktop browser for full functionality. Features like the interactive map, data visualization, and dataset uploads are optimized for desktop devices."
            type="info"
            showIcon
            closable
          />
        </div>
        <div className="flex justify-center pt-12 md:pt-24">
          <Tag className="mb-6 text-xl" color="success">
            🚀 LAUNCHED
          </Tag>
        </div>
        <h1 className="m-0 bg-gradient-to-br from-blue-800 via-blue-600 via-purple-500 to-purple-700 bg-clip-text pb-10 text-center text-5xl font-bold text-transparent drop-shadow-sm md:text-7xl">
          deadtrees.earth
        </h1>
        <p className="mx-auto text-center text-xl text-gray-500 md:max-w-xl">
          An open database for accessing, contributing, analyzing, and visualizing remote sensing-based tree mortality
          data.
        </p>
        <div className="pt-8">
          <p className="text-md max-w-xl pb-1 text-center text-gray-500">
            Stay informed about new features and the latest developments.
          </p>
          <div className="flex w-full flex-col justify-center gap-2 pt-0 md:flex-row">
            <Input
              size="large"
              className="w-full md:w-80"
              placeholder="Enter email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
            <Button
              onClick={addSubscriber}
              className="w-full md:w-auto"
              type="primary"
              size="large"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Get notified
            </Button>
          </div>
        </div>
        {/* Video Section */}
        <div className="relative mx-auto mt-10 aspect-video w-full max-w-5xl overflow-hidden rounded-2xl bg-gray-100 shadow-2xl md:mt-14">
          {!isPlaying && (
            <PlayCircleFilled
              onClick={(e) => {
                setIsPlaying(true);
              }}
              className="pointer-events-none absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-1 text-6xl text-blue-600 transition-colors hover:text-blue-900"
            />
          )}
          <ReactPlayer
            url="https://data2.deadtrees.earth/assets/v1/New_Version_deadtrees_video.mp4"
            width="100%"
            height="100%"
            controls={true}
            playsinline
            loop={true}
            light="https://data2.deadtrees.earth/assets/v1/image.png" // Add this line with your thumbnail image path
            config={{
              file: {
                attributes: {
                  controlsList: "nodownload",
                },
              },
            }}
            playing={isPlaying}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;
