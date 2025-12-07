import React, { useState, useEffect } from 'react';
import { Button, Select, Typography } from 'antd';
import { LeftOutlined, RightOutlined, DoubleLeftOutlined, DoubleRightOutlined } from '@ant-design/icons';
import './Pagination.css';

const { Text } = Typography;
const { Option } = Select;

const Pagination = ({
  current = 1,
  total = 0,
  pageSize = 10,
  pageSizeOptions = ['10', '25', '50', '100'],
  showSizeChanger = true,
  showTotal = true,
  showTotalCustom = null, // Custom total text function
  onChange,
  onShowSizeChange,
  className = '',
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const totalPages = Math.ceil(total / pageSize);
  const start = (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePageChange = (page) => {
    if (onChange && page >= 1 && page <= totalPages) {
      onChange(page, pageSize);
    }
  };

  const handleSizeChange = (size) => {
    if (onShowSizeChange) {
      onShowSizeChange(current, typeof size === 'string' ? parseInt(size, 10) : size);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = isMobile ? 3 : 5;
    
    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      let startPage = Math.max(2, current - 1);
      let endPage = Math.min(totalPages - 1, current + 1);
      
      // Adjust if we're near the start
      if (current <= 2) {
        endPage = Math.min(4, totalPages - 1);
      }
      
      // Adjust if we're near the end
      if (current >= totalPages - 1) {
        startPage = Math.max(2, totalPages - 3);
      }
      
      // Add ellipsis before if needed
      if (startPage > 2) {
        pages.push('ellipsis-start');
      }
      
      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // Add ellipsis after if needed
      if (endPage < totalPages - 1) {
        pages.push('ellipsis-end');
      }
      
      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (total === 0) {
    return null;
  }

  return (
    <div className={`modern-pagination ${className} ${isMobile ? 'mobile' : ''}`}>
      {/* Left side: Total info and page size selector */}
      <div className="pagination-left">
        {showTotal && (
          <Text className="pagination-total" type="secondary">
            {showTotalCustom ? (
              showTotalCustom(total)
            ) : isMobile ? (
              <span>{start}-{end} / {total}</span>
            ) : (
              <span>Rāda <strong>{start}</strong> līdz <strong>{end}</strong> no <strong>{total}</strong> rezultātiem</span>
            )}
          </Text>
        )}
        {showSizeChanger && (
          <div className="pagination-size-changer">
            <Text type="secondary" className="size-changer-label">Rādīt:</Text>
            <Select
              value={pageSize.toString()}
              onChange={handleSizeChange}
              size="small"
              className="pagination-select"
            >
              {pageSizeOptions.map((size) => (
                <Option key={size} value={size}>
                  {size}
                </Option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {/* Right side: Page navigation */}
      <div className="pagination-right">
        <div className="pagination-controls">
          {/* First page button */}
          <Button
            type="text"
            icon={<DoubleLeftOutlined />}
            onClick={() => handlePageChange(1)}
            disabled={current === 1}
            className="pagination-btn pagination-btn-icon"
            aria-label="Pirmā lapa"
          />

          {/* Previous page button */}
          <Button
            type="text"
            icon={<LeftOutlined />}
            onClick={() => handlePageChange(current - 1)}
            disabled={current === 1}
            className="pagination-btn pagination-btn-icon"
            aria-label="Iepriekšējā lapa"
          />

          {/* Page numbers */}
          <div className="pagination-numbers">
            {getPageNumbers().map((page, index) => {
              if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                return (
                  <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                    ...
                  </span>
                );
              }
              
              return (
                <Button
                  key={page}
                  type={current === page ? 'primary' : 'text'}
                  onClick={() => handlePageChange(page)}
                  className={`pagination-btn pagination-number ${current === page ? 'active' : ''}`}
                  aria-label={`Lapa ${page}`}
                  aria-current={current === page ? 'page' : undefined}
                >
                  {page}
                </Button>
              );
            })}
          </div>

          {/* Next page button */}
          <Button
            type="text"
            icon={<RightOutlined />}
            onClick={() => handlePageChange(current + 1)}
            disabled={current === totalPages}
            className="pagination-btn pagination-btn-icon"
            aria-label="Nākamā lapa"
          />

          {/* Last page button */}
          <Button
            type="text"
            icon={<DoubleRightOutlined />}
            onClick={() => handlePageChange(totalPages)}
            disabled={current === totalPages}
            className="pagination-btn pagination-btn-icon"
            aria-label="Pēdējā lapa"
          />
        </div>
      </div>
    </div>
  );
};

export default Pagination;

