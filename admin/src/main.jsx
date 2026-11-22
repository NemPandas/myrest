import React from 'react';
import { createRoot } from 'react-dom/client';
import { Admin } from './Admin.jsx';
import '../../shared/storefront.css';
import './admin.css';

createRoot(document.getElementById('root')).render(<Admin />);
