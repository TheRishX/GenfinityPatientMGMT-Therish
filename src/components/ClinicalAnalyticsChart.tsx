import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Patient, Appointment } from '../types';

interface ClinicalAnalyticsChartProps {
  patients: Patient[];
  appointments: Appointment[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
}

export default function ClinicalAnalyticsChart({
  patients,
  appointments,
  selectedCategory,
  setSelectedCategory
}: ClinicalAnalyticsChartProps) {
  const barChartRef = useRef<SVGSVGElement | null>(null);
  const pieChartRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Group patients by referral source or status
  const statusCounts = patients.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.entries(statusCounts).map(([key, value]) => ({
    label: key,
    value
  }));

  // Device categories for Appointments Chart
  const deviceCounts = appointments.reduce((acc, appt) => {
    let device = 'Other';
    if (appt.type.includes('AFO')) device = 'AFO';
    else if (appt.type.includes('KAFO')) device = 'KAFO';
    else if (appt.type.includes('Prosthesis') || appt.type.includes('Prosthetic')) device = 'Prosthesis';
    else if (appt.type.includes('Align') || appt.type.includes('Check')) device = 'Follow-up';
    
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const deviceData = Object.entries(deviceCounts).map(([key, value]) => ({
    category: key,
    count: value
  }));

  // Build the Bar Chart (Device Breakdown)
  useEffect(() => {
    if (!barChartRef.current || deviceData.length === 0) return;

    // Clear previous elements
    d3.select(barChartRef.current).selectAll('*').remove();

    const width = 450;
    const height = 180;
    const margin = { top: 15, right: 15, bottom: 35, left: 35 };

    const svg = d3.select(barChartRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', '100%');

    // Scales
    const x = d3.scaleBand()
      .domain(deviceData.map(d => d.category))
      .range([margin.left, width - margin.right])
      .padding(0.3);

    const maxVal = d3.max(deviceData, d => d.count) || 1;
    const y = d3.scaleLinear()
      .domain([0, maxVal + 1])
      .range([height - margin.bottom, margin.top]);

    // Color definitions
    const activeColor = '#af2022'; // Genfinity Red
    const normalColor = '#19619d'; // Genfinity Blue
    const hoverColor = '#ffc4be';

    // Grid lines
    svg.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(
        d3.axisBottom(x)
          .tickSize(-height + margin.top + margin.bottom)
          .tickFormat(() => '')
      );

    svg.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(
        d3.axisLeft(y)
          .ticks(5)
          .tickSize(-width + margin.left + margin.right)
          .tickFormat(() => '')
      );

    // Axes
    svg.append('g')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('font-family', 'Nunito Sans')
      .style('font-size', '10px')
      .style('fill', '#5a403e');

    svg.append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('d')))
      .selectAll('text')
      .style('font-family', 'Nunito Sans')
      .style('font-size', '10px')
      .style('fill', '#5a403e');

    // Drawing Bars
    svg.selectAll('.bar')
      .data(deviceData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.category) || 0)
      .attr('y', height - margin.bottom)
      .attr('width', x.bandwidth())
      .attr('height', 0)
      .attr('rx', 4) // Rounded corners for soft modernism
      .attr('fill', d => selectedCategory === d.category ? activeColor : normalColor)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        if (selectedCategory === d.category) {
          setSelectedCategory(null);
        } else {
          setSelectedCategory(d.category);
        }
      })
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('fill', hoverColor);
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('fill', selectedCategory === d.category ? activeColor : normalColor);
      })
      .transition()
      .duration(800)
      .attr('y', d => y(d.count))
      .attr('height', d => height - margin.bottom - y(d.count));

    // Data labels on top of bars
    svg.selectAll('.label')
      .data(deviceData)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('x', d => (x(d.category) || 0) + x.bandwidth() / 2)
      .attr('y', d => y(d.count) - 4)
      .attr('text-anchor', 'middle')
      .style('font-family', 'Nunito Sans')
      .style('font-size', '9px')
      .style('font-weight', 'bold')
      .style('fill', '#1b1c1c')
      .text(d => d.count);

  }, [deviceData, selectedCategory]);

  // Build the Pie/Donut Chart (Status Breakdown)
  useEffect(() => {
    if (!pieChartRef.current || statusData.length === 0) return;

    d3.select(pieChartRef.current).selectAll('*').remove();

    const width = 200;
    const height = 180;
    const radius = Math.min(width, height) / 2 - 10;

    const svg = d3.select(pieChartRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', '100%')
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Color Scale
    const colors = d3.scaleOrdinal<string>()
      .domain(statusData.map(d => d.label))
      .range(['#19619d', '#82bdfe', '#004c80', '#af2022', '#ffdad6', '#585b5c', '#eae8e7']);

    // Arc & Pie generators
    const pie = d3.pie<{ label: string; value: number }>()
      .value(d => d.value)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>()
      .innerRadius(45) // Makes it a donut chart!
      .outerRadius(radius)
      .cornerRadius(4); // Rounded ends

    const arcHover = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>()
      .innerRadius(40)
      .outerRadius(radius + 5)
      .cornerRadius(4);

    // Draw slices
    const path = svg.selectAll('path')
      .data(pie(statusData))
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', d => colors(d.data.label))
      .attr('stroke', '#ffffff')
      .style('stroke-width', '2px')
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('d', arcHover);
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arc);
      })
      .on('click', (event, d) => {
        // Toggle category selection
        if (selectedCategory === d.data.label) {
          setSelectedCategory(null);
        } else {
          setSelectedCategory(d.data.label);
        }
      });

    // Animate transition on load
    path.transition()
      .duration(1000)
      .attrTween('d', function(d) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function(t) {
          return arc(interpolate(t)) || '';
        };
      });

    // Center count label
    const totalCount = patients.length;
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-5px')
      .style('font-family', 'Nunito Sans')
      .style('font-size', '20px')
      .style('font-weight', '800')
      .style('fill', '#1b1c1c')
      .text(totalCount);

    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '12px')
      .style('font-family', 'Nunito Sans')
      .style('font-size', '9px')
      .style('font-weight', '600')
      .style('fill', '#5a403e')
      .text('Patients');

  }, [statusData, selectedCategory]);

  return (
    <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-surface-container-highest/20">
      {/* Chart 1: Appointments Trend */}
      <div className="lg:col-span-2">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h4 className="text-sm font-bold text-on-surface">Interactive Analytics &amp; Case Volume</h4>
            <p className="text-xs text-on-surface-variant">Click columns to filter today's appointments list by device category</p>
          </div>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-xs text-primary font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-xs">close</span> Clear Filter
            </button>
          )}
        </div>
        <div className="w-full flex items-center justify-center">
          <svg ref={barChartRef} className="w-full max-h-[180px]" />
        </div>
      </div>

      {/* Chart 2: Status breakdown */}
      <div className="border-t lg:border-t-0 lg:border-l border-surface-container-highest/40 pt-4 lg:pt-0 lg:pl-6 flex flex-col justify-between">
        <div>
          <h4 className="text-sm font-bold text-on-surface">Workload Distribution</h4>
          <p className="text-xs text-on-surface-variant">Donut slice breakdown of active patients</p>
        </div>
        <div className="flex items-center justify-around gap-2 mt-2">
          <svg ref={pieChartRef} className="max-w-[130px] max-h-[130px] shrink-0" />
          <div className="space-y-1 shrink-0">
            {statusData.slice(0, 4).map((d, idx) => {
              const colors = ['#19619d', '#82bdfe', '#004c80', '#af2022', '#ffdad6'];
              return (
                <div key={d.label} className="flex items-center gap-2 text-[10px]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
                  <span className="font-semibold text-on-surface-variant truncate max-w-[80px]">{d.label}:</span>
                  <span className="font-extrabold text-on-surface">{d.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
