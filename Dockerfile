# Docker image for an HIV-TRACE development environment
FROM oraclelinux:8

# Set up environment and install dependencies
RUN yum -y update && \
    yum install -y bzip2-devel cmake gcc gcc-c++ git libcurl-devel make openssl-devel python3.11 python3.11-devel python3.11-pip wget xz-devel && \

    # Update pip and use it to install Python packages
    python3 -m pip install --upgrade pip && \
    pip3 install biopython cython numpy scipy && \

    # Install tn93
    wget -qO- "https://github.com/veg/tn93/archive/refs/tags/v.1.0.11.tar.gz" | tar -zx && \
    cd tn93-* && \
    # The current tn93 OpenMP syntax is incompatible with GCC 8.5.0, which is what gets installed by the above commands.
    # To compile tn93, make the following two edits to the tn93 source code (remove once OpenMP compatibility is fixed in tn93):
    sed -i 's/shared(currently_defined_clusters, try_cluster, sequence_lengths, current_sequence, current_clusters, firstSequenceLength, min_overlap)/shared(currently_defined_clusters, try_cluster, sequence_lengths, current_sequence, current_clusters)/g' src/read_reducer.cpp && \
    sed -i 's/shared(my_distance_estimate,nodeParents,workingNodes,distanceEstimates, step_penalty, min_overlap, resolutionOption, firstSequenceLength, theSequence, left_to_do)/shared(my_distance_estimate,nodeParents,workingNodes,distanceEstimates)/g' src/ShortestPathTN93.cpp && \
    cmake . && \
    make install && \
    cd .. && \
    rm -rf tn93-* && \

    # Clean up
    rm -rf ~/.cache /tmp/* ~/.wget-hsts

# To compile HIV-TRACE within the development environment:
#   python3 setup.py develop
