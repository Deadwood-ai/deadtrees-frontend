
import { useState, useEffect } from 'react';
import { Button, Spin, Result, Row, Col } from 'antd';
import { useForestGuessrData } from '../hooks/useForestGuessrData';
import ForestGuessrMap from '../components/ForestGuessr/ForestGuessrMap';
import GuessingMap from '../components/ForestGuessr/GuessingMap';
import { getDistance } from 'ol/sphere';
import { Settings } from "../config";

const ForestGuessr = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [userGuess, setUserGuess] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [clearGuessMarker, setClearGuessMarker] = useState(false);
  const [guessConfirmed, setGuessConfirmed] = useState(false);

  const { data: datasets, isLoading, error } = useForestGuessrData();

  useEffect(() => {
    console.log("Datasets:", datasets);
    if (datasets && datasets.length > 0) {
      console.log("Current round dataset:", datasets[currentRound]);
      console.log("COG Path:", datasets[currentRound]?.cog_path);
      console.log("BBox:", datasets[currentRound]?.bbox);
      console.log("Centroid:", datasets[currentRound]?.centroid);
    }
  }, [datasets, currentRound]);

  const handleStartGame = () => {
    setGameStarted(true);
  };

  const handleGuess = (guess) => {
    console.log("User guess received:", guess);
    setUserGuess(guess);
  };

  const handleConfirmGuess = () => {
    console.log("Confirming guess. Current userGuess:", userGuess);
    if (userGuess && datasets && datasets[currentRound] && datasets[currentRound].centroid) {
      const actualLocation = datasets[currentRound].centroid.coordinates;
      const calculatedDistance = getDistance(userGuess, actualLocation);
      const maxScore = 5000;
      const minScore = 1;
      const maxDistance = 20000000; // meters, approx half circumference of Earth
      const calculatedScore = maxScore - (calculatedDistance / maxDistance) * (maxScore - minScore);
      const currentRoundScore = Math.max(minScore, calculatedScore);
      setScore(score + currentRoundScore);
      setRoundScore(currentRoundScore);
      setDistance(calculatedDistance);
      setShowResults(true);
      setGuessConfirmed(true);
      console.log("Round score:", currentRoundScore);
      console.log("guessConfirmed after guess:", true);
    } else {
      console.log("Cannot confirm guess: userGuess is null or dataset/centroid is missing.");
    }
  };

  const handleNextRound = () => {
    setShowResults(false);
    setUserGuess(null);
    setCurrentRound(currentRound + 1);
    setClearGuessMarker(true); // Trigger marker clear
    setTimeout(() => setClearGuessMarker(false), 0); // Reset after a short delay
    setGuessConfirmed(false);
    console.log("guessConfirmed after next round:", false);
  };

  const handleNewGame = () => {
    setGameStarted(false);
    setCurrentRound(0);
    setScore(0);
    setRoundScore(0);
    setDistance(0);
    setUserGuess(null);
    setShowResults(false);
    setClearGuessMarker(false);
    setGuessConfirmed(false);
  };

  if (isLoading) {
    return <Spin size="large" />;
  }

  if (error) {
    return <Result status="warning" title="Could not fetch data for the game." subTitle={error.message} />;
  }

  if (!datasets || datasets.length === 0) {
    return <Result status="warning" title="No datasets available for the game." />;
  }

  return (
    <div style={{ height: '100%', width: '100%' }}>
      {!gameStarted ? (
        <div style={{ textAlign: 'center', paddingTop: '50px' }}>
          <Button type="primary" size="large" onClick={handleStartGame}>
            Start Game
          </Button>
        </div>
      ) : currentRound < 5 ? (
        <Row style={{ height: '100%' }}>
          <Col span={18} style={{ height: '100%' }}>
            <ForestGuessrMap cogUrl={Settings.COG_BASE_URL + datasets[currentRound].cog_path} />
          </Col>
          <Col span={6} style={{ height: '100%' }}>
            <div style={{ height: '40%', padding: '10px' }}>
              <GuessingMap onGuess={handleGuess} clearMarker={clearGuessMarker} disabled={guessConfirmed} trueLocation={showResults ? datasets[currentRound].centroid.coordinates : null} />
            </div>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Button type="primary" onClick={handleConfirmGuess} disabled={!userGuess || guessConfirmed}>
                Guess!
              </Button>
            </div>
            {showResults && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <h2>Round {currentRound + 1} Results</h2>
                <p>Distance: {Math.round(distance / 1000)} km</p>
                <p>Round Score: {Math.round(roundScore)}</p>
                <p>Total Score: {Math.round(score)}</p>
                <Button onClick={handleNextRound}>Next Round</Button>
              </div>
            )}
          </Col>
        </Row>
      ) : (
        <div style={{ textAlign: 'center', paddingTop: '50px' }}>
          <h1>Congratulations!</h1>
          <h2>Your final score is: {Math.round(score)}</h2>
          <Button type="primary" size="large" onClick={handleNewGame}>
            New Game
          </Button>
        </div>
      )}
    </div>
  );
};

export default ForestGuessr;
