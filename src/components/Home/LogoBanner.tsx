interface LogoBannerProps {
  logos: Array<{
    path?: string;
    text?: string;
  }>;
  title: string;
}

export default function LogoBannerBand({ logos, title }: LogoBannerProps) {
  return (
    <div className="pt-0 md:pt-12">
      <p className="text-md mb-8 text-center text-gray-600">{title}</p>
      <div className="logo-scroll">
        <div className="logo-container">
          {/* First set of logos */}
          {logos.map((logo, index) => (
            <div key={index} className="logo-item">
              {logo.text ? (
                <p className="whitespace-nowrap rounded-md bg-gradient-to-r from-blue-700 to-purple-500 bg-clip-text text-center text-xl font-bold text-transparent">
                  {logo.text}
                </p>
              ) : (
                <img src={logo.path} alt="Partner logo" className="h-16 w-full object-contain" />
              )}
            </div>
          ))}
          {/* Duplicate set for seamless loop */}
          {logos.map((logo, index) => (
            <div key={`dup-${index}`} className="logo-item">
              {logo.text ? (
                <p className="whitespace-nowrap rounded-md bg-gradient-to-r from-blue-700 to-purple-500 bg-clip-text text-center text-xl font-bold text-transparent">
                  {logo.text}
                </p>
              ) : (
                <img src={logo.path} alt="Partner logo" className="h-16 w-full object-contain" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
