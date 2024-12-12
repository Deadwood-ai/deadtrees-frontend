import { useState } from "react";
import { Alert, Button, Input, Tag } from "antd";
import { PlayCircleFilled } from "@ant-design/icons";
import ReactPlayer from "react-player";
import { supabase } from "../../hooks/useSupabase";
import { notification } from "antd";

const Hero = () => {
  const [email, setEmail] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);

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
    const { data, error } = await supabase.from("newsletter").insert([{ email }]);
    if (error) {
      notification.error({
        message: "Error",
        description: "An error occurred while adding the subscriber.",
        placement: "topRight",
      });
      console.error("Error adding subscriber:", error);
    } else {
      notification.success({
        message: "Thank you!",
        description: "You will be notified as soon as the service is up and running.",
        placement: "topRight",
      });
      console.log("Subscriber added:", email);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center pb-12">
      <div className="absolute inset-0 hidden bg-[radial-gradient(600px_at_50%_30%,_var(--tw-gradient-stops))] from-blue-100 via-blue-50 to-white md:block"></div>
      <div className="relative z-10">
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
          <Tag className="mb-4 text-xl" color="warning">
            BETA
          </Tag>
        </div>
        <h1 className="m-0 bg-gradient-to-br from-blue-800 via-blue-600 via-purple-500 to-purple-700 bg-clip-text pb-10 text-center text-5xl font-bold text-transparent drop-shadow-sm md:text-7xl">
          deadtrees.earth
        </h1>
        <p className="m-auto text-center text-xl text-gray-500 md:max-w-xl">
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
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button onClick={addSubscriber} className="w-full md:w-auto" type="primary" size="large">
              Get notified
            </Button>
          </div>
        </div>
      </div>
      {/* Video Section */}
      <div className="relative mx-auto mt-12 aspect-video w-full max-w-5xl overflow-hidden rounded-2xl bg-gray-100 shadow-2xl md:mt-32">
        {!isPlaying && (
          <PlayCircleFilled
            onClick={(e) => {
              setIsPlaying(true);
            }}
            className="pointer-events-none absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-1 text-6xl text-blue-600 transition-colors hover:text-blue-900"
          />
        )}
        <ReactPlayer
          url="https://ijuphmnaebfdzsfrnsrn.supabase.co/storage/v1/object/public/video/deadtrees_V2_final.mp4"
          width="100%"
          height="100%"
          controls={true}
          playsinline
          loop={true}
          light="https://ijuphmnaebfdzsfrnsrn.supabase.co/storage/v1/object/public/video/image.png?t=2024-12-10T11%3A01%3A12.395Z" // Add this line with your thumbnail image path
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
  );
};

export default Hero;
