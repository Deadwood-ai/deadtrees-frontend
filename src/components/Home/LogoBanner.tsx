interface LogoBannerProps {
  logos: Array<{
    path?: string;
    text?: string;
    url?: string;
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
            <a
              key={index}
              href={logo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="logo-item flex flex-col items-center gap-2 transition-transform duration-200 hover:scale-105"
            >
              <img
                src={logo.path}
                alt={logo.text || "Partner logo"}
                className="h-16 w-full object-contain transition-opacity duration-200 hover:opacity-80"
              />
              {logo.text && (
                <p className="text-center text-sm text-gray-600 transition-colors duration-200 hover:text-blue-600">
                  {logo.text}
                </p>
              )}
            </a>
          ))}
          {/* Duplicate set for seamless loop */}
          {logos.map((logo, index) => (
            <a
              key={`dup-${index}`}
              href={logo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="logo-item flex flex-col items-center gap-2 transition-transform duration-200 hover:scale-105"
            >
              <img
                src={logo.path}
                alt={logo.text || "Partner logo"}
                className="h-16 w-full object-contain transition-opacity duration-200 hover:opacity-80"
              />
              {logo.text && (
                <p className="text-center text-sm text-gray-600 transition-colors duration-200 hover:text-blue-600">
                  {logo.text}
                </p>
              )}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
