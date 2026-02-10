import React from 'react';
import { useNavigate } from 'react-router-dom';
import FilterScreen from '../components/FilterScreen';
import { quizStorage } from '../utils/quizStorage';

export default function TopicSelectionPage({ questions }) {
  const navigate = useNavigate();

  const handleStart = (selectedQuestions) => {
    // Clear any previous quiz data
    quizStorage.clearQuizData();
    
    // Save selected questions
    quizStorage.saveSelectedQuestions(selectedQuestions);
    
    // Navigate to quiz page
    navigate('/quiz');
  };

  return <FilterScreen questions={questions} onStart={handleStart} />;
}