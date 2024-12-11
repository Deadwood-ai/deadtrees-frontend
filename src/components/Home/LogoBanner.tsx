const LogoBannerBand = () => {
  const logos = [
    { path: "assets/logos/bml.png" },
    { path: "assets/logos/esa.jpg" },
    { path: "assets/logos/dfg.jpeg" },
    { path: "assets/logos/uni-freiburg.png" },
    { text: "RSC4Earth" },
    { path: "assets/logos/NFDI4Earth_logo.jpg" },
    { path: "assets/logos/scads.png" },
  ];

  return (
    <div className="pt-0 md:pt-12">
      <p className="text-md mb-8 text-center text-gray-600">Supported by</p>
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
};

export default LogoBannerBand;
